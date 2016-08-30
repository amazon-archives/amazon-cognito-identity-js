/* eslint-disable require-jsdoc */

import test from 'ava';
import mockRequire from 'mock-require';

import {
  requireDefaultWithModuleMocks,
  requestFailsWith,
  requestSucceedsWith,
} from './_testHelpers';

class MockUserPool {
}

const USERNAME = 'some-username';

function createUser(pool = new MockUserPool()) {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', {
    // Nothing yet
  });
  return new CognitoUser({ Username: USERNAME, Pool: pool });
}

function constructorRequiredParams(t, data) {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser');
  t.throws(() => new CognitoUser(data), /required/);
}
constructorRequiredParams.title = (_, data) => (
  `constructor(${JSON.stringify(data)}) => throws`
);
test(constructorRequiredParams, null);
test(constructorRequiredParams, {});
test(constructorRequiredParams, { Username: null, Pool: null });
test(constructorRequiredParams, { Username: null, Pool: new MockUserPool() });
test(constructorRequiredParams, { Username: USERNAME, Pool: null });

test('constructor() :: valid => creates expected instance', t => {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser');
  const pool = new MockUserPool();

  const user = new CognitoUser({ Username: USERNAME, Pool: pool });

  t.is(user.getSignInUserSession(), null);
  t.is(user.getUsername(), USERNAME);
  t.is(user.getAuthenticationFlowType(), 'USER_SRP_AUTH');
  t.is(user.pool, pool);
});

test('setAuthenticationFlowType() => sets authentication flow type', t => {
  const user = createUser();
  const flowType = 'CUSTOM_AUTH';

  user.setAuthenticationFlowType(flowType);

  t.is(user.getAuthenticationFlowType(), flowType);
});

test.todo('authenticateUser() :: USER_SRP_AUTH, succeeds => creates session');
test.todo('authenticateUser() :: USER_SRP_AUTH, fails => raises onFailure');
// ... lots more!
