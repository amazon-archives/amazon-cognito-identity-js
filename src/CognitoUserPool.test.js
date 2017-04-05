/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestFailsWith,
  requestSucceedsWith,
} from './_helpers.test';

class MockCognitoUser {
  constructor({ Username, Pool }) {
    this.username = Username;
    this.pool = Pool;
  }
}

function requireCognitoUserPool() {
  return requireDefaultWithModuleMocks('./CognitoUserPool', {
    './CognitoUser': MockCognitoUser,
  });
}

const UserPoolId = 'xx-nowhere1_SomeUserPool'; // Constructor validates the format.
const ClientId = 'some-client-id';

function createPool(extraData = {}) {
  const CognitoUserPool = requireCognitoUserPool();
  return new CognitoUserPool(Object.assign({}, { UserPoolId, ClientId }, extraData));
}

function createPoolWithClient(...requestConfigs) {
  const pool = createPool();
  pool.client = new MockClient(...requestConfigs);
  return pool;
}

function constructorThrowsRequired(t, data) {
  const CognitoUserPool = requireCognitoUserPool();
  t.throws(() => new CognitoUserPool(data), /required/);
}
constructorThrowsRequired.title = (originalTitle, data) => (
  `constructor( ${JSON.stringify(data)} ) => throws with "required"`
);
test(constructorThrowsRequired, null);
test(constructorThrowsRequired, {});
test(constructorThrowsRequired, { UserPoolId: null, ClientId: null });
test(constructorThrowsRequired, { UserPoolId, ClientId: null });
test(constructorThrowsRequired, { UserPoolId: null, ClientId });

test('constructor :: invalid UserPoolId => throws with "Invalid UserPoolId"', t => {
  const CognitoUserPool = requireCognitoUserPool();
  const data = { UserPoolId: 'invalid-user-pool-id', ClientId };
  t.throws(() => new CognitoUserPool(data), /Invalid UserPoolId/);
});

test('constructor => creates instance with expected values', t => {
  const pool = createPool();
  t.truthy(pool);
  t.is(pool.getUserPoolId(), UserPoolId);
  t.is(pool.getClientId(), ClientId);
  t.is(pool.getParanoia(), 0);
  t.true(pool.client instanceof MockClient);
});

test('constructor({ Paranoia }) => sets paranoia', t => {
  const paranoia = 7;
  const pool = createPool({ Paranoia: paranoia });
  t.is(pool.getParanoia(), paranoia);
});

test('setParanoia() => sets paranoia', t => {
  const pool = createPoolWithClient();
  const paranoia = 7;
  pool.setParanoia(paranoia);
  t.is(pool.getParanoia(), paranoia);
});

test.cb('signUp() :: fails => callback gets error', t => {
  const expectedError = { code: 'SomeError' };
  const pool = createPoolWithClient(requestFailsWith(expectedError));
  pool.signUp('username', 'password', null, null, err => {
    t.is(err, expectedError);
    t.end();
  });
});

test.cb('signUp() :: success => callback gets user and confirmed', t => {
  const expectedUsername = 'username';
  const pool = createPoolWithClient(requestSucceedsWith({ UserConfirmed: true }));
  pool.signUp(expectedUsername, 'password', null, null, (err, result) => {
    t.true(result.user instanceof MockCognitoUser);
    t.is(result.user.username, expectedUsername);
    t.is(result.user.pool, pool);
    t.true(result.userConfirmed);
    t.end();
  });
});

test('getCurrentUser() :: no last user => returns null', t => {
  const pool = createPoolWithClient();
  const localStorage = {
    getItem: stub().returns(null),
  };
  global.window = { localStorage };

  t.is(pool.getCurrentUser(), null);

  t.true(localStorage.getItem.calledOnce);
  t.true(localStorage.getItem.calledWithExactly(
    `CognitoIdentityServiceProvider.${pool.getClientId()}.LastAuthUser`
  ));
});

test('getCurrentUser() :: with last user => returns user instance', t => {
  const pool = createPoolWithClient();
  const username = 'username';
  const localStorage = {
    getItem: stub().returns(username),
  };
  global.window = { localStorage };

  const currentUser = pool.getCurrentUser();
  t.true(currentUser instanceof MockCognitoUser);
  t.is(currentUser.username, username);

  t.true(localStorage.getItem.calledOnce);
  t.true(localStorage.getItem.calledWithExactly(
    `CognitoIdentityServiceProvider.${pool.getClientId()}.LastAuthUser`
  ));
});
