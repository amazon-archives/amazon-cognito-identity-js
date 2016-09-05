/* eslint-disable require-jsdoc */

import test from 'ava';
import mockRequire from 'mock-require';

import {
  requireDefaultWithModuleMocks,
  requestFailsWith,
  requestSucceedsWith,
  stubClient,
} from './_testHelpers';

const USERNAME = 'some-username';
const CLIENT_ID = 'some-client-id';
const ACCESS_TOKEN = 'some-access-token';

class MockUserPool {
  getClientId() { return CLIENT_ID; }
}

class MockSession {
  isValid() {
    return true;
  }

  getAccessToken() {
    return {
      getJwtToken() {
        return ACCESS_TOKEN;
      },
    };
  }
}

function createUser({ pool = new MockUserPool(), session } = {}, ...requests) {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', {
    // Nothing yet
  });
  const user = new CognitoUser({ Username: USERNAME, Pool: pool });
  stubClient(user.client, ...requests);
  user.signInUserSession = session;
  return user;
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

// See CognitoUser_auth.test.js for authenticateUser() and the challenge responses

function createExpectedErrorFromSuccess(succeeds) {
  return succeeds ? null : { code: 'InternalServerException' };
}

function requestCalledWithOnCall(t, client, call, ...expectedArgs) {
  const actualArgsExceptCallback = client.makeUnauthenticatedRequest.args[call].slice();
  t.true(typeof actualArgsExceptCallback.pop() === 'function');
  t.deepEqual(actualArgsExceptCallback, expectedArgs);
}

function requestCalledOnceWith(t, client, ...expectedArgs) {
  t.true(client.makeUnauthenticatedRequest.callCount === 1);
  requestCalledWithOnCall(t, client, 0, ...expectedArgs);
}

function confirmRegistrationMacro(t, forceAliasCreation, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createUser({}, [expectedError]);

  const confirmationCode = '123456';
  user.confirmRegistration(confirmationCode, forceAliasCreation, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'confirmSignUp', {
      ClientId: CLIENT_ID,
      ConfirmationCode: confirmationCode,
      Username: USERNAME,
      ForceAliasCreation: forceAliasCreation,
    });
    t.end();
  });
}
confirmRegistrationMacro.title = (_, forceAliasCreation, succeeds) => (
  `confirmRegistration(forceAliasCreation: ${forceAliasCreation}) :: ${
    succeeds ? 'succeeds' : 'fails'
  }`
);
test.cb(confirmRegistrationMacro, false, false);
test.cb(confirmRegistrationMacro, true, false);
test.cb(confirmRegistrationMacro, false, true);
test.cb(confirmRegistrationMacro, true, true);

function createSignedInUserWithExpectedError(expectedError) {
  return createUser({ session: new MockSession() }, [expectedError]);
}

function changePasswordMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  const oldUserPassword = 'swordfish';
  const newUserPassword = 'slaughterfish';
  user.changePassword(oldUserPassword, newUserPassword, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'changePassword', {
      PreviousPassword: oldUserPassword,
      ProposedPassword: newUserPassword,
      AccessToken: ACCESS_TOKEN,
    });
    t.end();
  });
}
changePasswordMacro.title = (_, succeeds) => (
  `changePassword() :: ${succeeds ? 'succeeds' : 'fails'}`
);
test.cb(changePasswordMacro, false);
test.cb(changePasswordMacro, true);

function enableMFAMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.enableMFA(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'setUserSettings', {
      MFAOptions: [
        { DeliveryMedium: 'SMS', AttributeName: 'phone_number' },
      ],
      AccessToken: ACCESS_TOKEN,
    });
    t.end();
  });
}
enableMFAMacro.title = (_, succeeds) => (
  `enableMFA() :: ${succeeds ? 'succeeds' : 'fails'}`
);
test.cb(enableMFAMacro, false);
test.cb(enableMFAMacro, true);

function disableMFAMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.disableMFA(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'setUserSettings', {
      MFAOptions: [],
      AccessToken: ACCESS_TOKEN,
    });
    t.end();
  });
}
disableMFAMacro.title = (_, succeeds) => (
  `disableMFA() :: ${succeeds ? 'succeeds' : 'fails'}`
);
test.cb(disableMFAMacro, false);
test.cb(disableMFAMacro, true);

function deleteUserMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.deleteUser(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'deleteUser', {
      AccessToken: ACCESS_TOKEN,
    });
    t.end();
  });
}
deleteUserMacro.title = (_, succeeds) => (
  `deleteUser() :: ${succeeds ? 'succeeds' : 'fails'}`
);
test.cb(deleteUserMacro, false);
test.cb(deleteUserMacro, true);

function updateAttributesMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  const attributes = [
    { Name: 'some_name', Value: 'some_value' },
  ];

  user.updateAttributes(attributes, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'updateUserAttributes', {
      UserAttributes: attributes,
      AccessToken: ACCESS_TOKEN,
    });
    t.end();
  });
}
updateAttributesMacro.title = (_, succeeds) => (
  `updateAttributes() :: ${succeeds ? 'succeeds' : 'fails'}`
);
test.cb(updateAttributesMacro, false);
test.cb(updateAttributesMacro, true);
