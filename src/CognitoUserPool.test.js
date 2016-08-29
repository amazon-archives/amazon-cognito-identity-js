/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';
import mockRequire from 'mock-require';

// Mock dependencies
class MockClient {}
mockRequire('aws-sdk', {
  CognitoIdentityServiceProvider: MockClient,
});

class MockCognitoUser {
  constructor({ Username, Pool }) {
    this.username = Username;
    this.pool = Pool;
  }
}
mockRequire('./CognitoUser', MockCognitoUser);

// Use with mocked dependencies
const CognitoUserPool = mockRequire.reRequire('./CognitoUserPool').default;


function constructorThrowsRequired(t, data) {
  t.throws(() => new CognitoUserPool(data), /required/);
}
test(constructorThrowsRequired, null);
test(constructorThrowsRequired, {});
test(constructorThrowsRequired, { UserPoolId: null, ClientId: null });
test(constructorThrowsRequired, { UserPoolId: '123', ClientId: null });
test(constructorThrowsRequired, { UserPoolId: null, ClientId: 'abc' });
constructorThrowsRequired.title = (originalTitle, data) => (
  `constructor( ${JSON.stringify(data)} ) => throws with "required"`
);
test('constructor => creates instance with expected values', t => {
  const data = { UserPoolId: '123', ClientId: 'abc' };
  const pool = new CognitoUserPool(data);
  t.truthy(pool);
  t.is(pool.getUserPoolId(), data.UserPoolId);
  t.is(pool.getClientId(), data.ClientId);
  t.is(pool.getParanoia(), 0);
  t.true(pool.client instanceof MockClient);
});

test('constructor({ Paranoia }) => sets paranoia', t => {
  const data = { UserPoolId: '123', ClientId: 'abc', Paranoia: 7 };
  const pool = new CognitoUserPool(data);
  t.is(pool.getParanoia(), data.Paranoia);
});

function create(...requestConfigs) {
  const pool = new CognitoUserPool({ UserPoolId: '123', ClientId: 'abc' });
  const requestStub = stub();
  requestConfigs.forEach((requestConfig, i) => {
    const expectation = requestStub.onCall(i);
    expectation.yieldsAsync(...requestConfig);
  });
  pool.client.makeUnauthenticatedRequest = requestStub;
  return pool;
}

function requestFailsWith(err) {
  return [err, null];
}

function requestSucceedsWith(result) {
  return [null, result];
}

test('setParanoia() => sets paranoia', t => {
  const pool = create();
  const paranoia = 7;
  pool.setParanoia(paranoia);
  t.is(pool.getParanoia(), paranoia);
});

test.cb('signUp() :: fails => callback gets error', t => {
  const expectedError = { code: 'SomeError' };
  const pool = create(requestFailsWith(expectedError));
  pool.signUp('username', 'password', null, null, err => {
    t.is(err, expectedError);
    t.end();
  });
});

test.cb('signUp() :: success => callback gets user and confirmed', t => {
  const expectedUsername = 'username';
  const pool = create(requestSucceedsWith({ UserConfirmed: true }));
  pool.signUp(expectedUsername, 'password', null, null, (err, result) => {
    t.true(result.user instanceof MockCognitoUser);
    t.is(result.user.username, expectedUsername);
    t.is(result.user.pool, pool);
    t.true(result.userConfirmed);
    t.end();
  });
});

test('getCurrentUser() :: no last user => returns null', t => {
  const pool = create();
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
  const pool = create();
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
