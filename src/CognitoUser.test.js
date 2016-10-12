/* eslint-disable require-jsdoc */

import test from 'ava';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestCalledOnceWith,
  createCallback,
  createBasicCallback,
} from './_helpers.test';

// Valid property values: constructor, request props, etc...
const Username = 'some-username';
const ClientId = 'some-client-id';
const AccessToken = 'some-access-token';
const CodeDeliveryDetails = {
  Destination: 'some-destination',
  DeliveryMedium: 'some-medium',
  AttributeName: 'some-attribute',
};

// Valid arguments
const attributeName = 'some-attribute-name';
const confirmationCode = '123456';
const attributes = [
  { Name: 'some-attribute-name-1', Value: 'some-attribute-value-1' },
  { Name: 'some-attribute-name-2', Value: 'some-attribute-value-2' },
];

class MockUserPool {
  constructor() {
    this.client = new MockClient();
  }

  getClientId() {
    return ClientId;
  }

  toJSON() {
    return '[mock UserPool]';
  }
}

class MockSession {
  isValid() {
    return true;
  }

  getAccessToken() {
    return {
      getJwtToken() {
        return AccessToken;
      },
    };
  }
}

function createUser({ pool = new MockUserPool(), session, mocks } = {}, ...requestConfigs) {
  pool.client = new MockClient(...requestConfigs); // eslint-disable-line no-param-reassign
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', mocks);
  const user = new CognitoUser({ Username, Pool: pool });
  user.signInUserSession = session;
  return user;
}

function createSignedInUserWithMocks(mocks, ...requests) {
  return createUser({ session: new MockSession(), mocks }, ...requests);
}

function createSignedInUser(...requests) {
  return createUser({ session: new MockSession() }, ...requests);
}

function createSignedInUserWithExpectedError(expectedError) {
  return createSignedInUser([expectedError]);
}

function createExpectedErrorFromSuccess(succeeds) {
  return succeeds ? null : { code: 'InternalServerException' };
}

function titleMapString(value) {
  return value && typeof value === 'object'
    ? Object.keys(value).map(key => `${key}: ${JSON.stringify(value[key])}`).join(', ')
    : value || '';
}

function title(fn, { args, context, succeeds, outcome = succeeds ? 'succeeds' : 'fails' }) {
  const fnString = typeof fn === 'function' ? fn.name.replace(/Macro$/, '') : fn;
  const contextString = context ? ` :: ${titleMapString(context)}` : '';
  return `${fnString}(${titleMapString(args)})${contextString} => ${outcome}`;
}

function addSimpleTitle(macro, { args, context } = {}) {
  // eslint-disable-next-line no-param-reassign
  macro.title = (_, succeeds, ...values) => (
    title(macro, {
      succeeds,
      args: args && args(...values),
      context: context && context(...values),
    })
  );
}


function constructorRequiredParamsMacro(t, data) {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser');
  t.throws(() => new CognitoUser(data), /required/);
}
constructorRequiredParamsMacro.title = (_, data) => (
  title('constructor', { args: data, outcome: 'throws "required"' })
);
test(constructorRequiredParamsMacro, null);
test(constructorRequiredParamsMacro, {});
test(constructorRequiredParamsMacro, { Username: null, Pool: null });
test(constructorRequiredParamsMacro, { Username: null, Pool: new MockUserPool() });
test(constructorRequiredParamsMacro, { Username, Pool: null });

test('constructor() :: valid => creates expected instance', t => {
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser');
  const pool = new MockUserPool();

  const user = new CognitoUser({ Username, Pool: pool });

  t.is(user.getSignInUserSession(), null);
  t.is(user.getUsername(), Username);
  t.is(user.getAuthenticationFlowType(), 'USER_SRP_AUTH');
  t.is(user.pool, pool);
});

test('setAuthenticationFlowType() => sets authentication flow type', t => {
  const user = createUser();
  const flowType = 'CUSTOM_AUTH';

  user.setAuthenticationFlowType(flowType);

  t.is(user.getAuthenticationFlowType(), flowType);
});

// See CognitoUser.authenticateUser.test.js for authenticateUser() and the challenge responses

function confirmRegistrationMacro(t, forceAliasCreation, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createUser({}, [expectedError]);

  user.confirmRegistration(confirmationCode, forceAliasCreation, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'confirmSignUp', {
      ClientId,
      ConfirmationCode: confirmationCode,
      Username,
      ForceAliasCreation: forceAliasCreation,
    });
    t.end();
  });
}
confirmRegistrationMacro.title = (_, forceAliasCreation, succeeds) => (
  title(confirmRegistrationMacro, { succeeds, args: { forceAliasCreation } })
);
test.cb(confirmRegistrationMacro, false, false);
test.cb(confirmRegistrationMacro, true, false);
test.cb(confirmRegistrationMacro, false, true);
test.cb(confirmRegistrationMacro, true, true);

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
      AccessToken,
    });
    t.end();
  });
}
addSimpleTitle(changePasswordMacro);
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
      AccessToken,
    });
    t.end();
  });
}
addSimpleTitle(enableMFAMacro);
test.cb(enableMFAMacro, false);
test.cb(enableMFAMacro, true);

function disableMFAMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.disableMFA(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'setUserSettings', {
      MFAOptions: [],
      AccessToken,
    });
    t.end();
  });
}
addSimpleTitle(disableMFAMacro);
test.cb(disableMFAMacro, false);
test.cb(disableMFAMacro, true);

function deleteUserMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.deleteUser(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'deleteUser', { AccessToken });
    t.end();
  });
}
addSimpleTitle(deleteUserMacro);
test.cb(deleteUserMacro, false);
test.cb(deleteUserMacro, true);

function updateAttributesMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.updateAttributes(attributes, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'updateUserAttributes', {
      UserAttributes: attributes,
      AccessToken,
    });
    t.end();
  });
}
addSimpleTitle(updateAttributesMacro);
test.cb(updateAttributesMacro, false);
test.cb(updateAttributesMacro, true);

function getUserAttributesMacro(t, succeeds) {
  class MockCognitoUserAttribute {
    constructor(...params) {
      this.params = params;
    }
  }

  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const responseResult = succeeds ? { UserAttributes: attributes } : null;

  const user = createSignedInUserWithMocks(
    {
      './CognitoUserAttribute': MockCognitoUserAttribute,
    },
    [expectedError, responseResult]);

  user.getUserAttributes((err, result) => {
    t.is(err, expectedError);
    if (succeeds) {
      t.true(Array.isArray(result) && result.every(i => i instanceof MockCognitoUserAttribute));
      t.deepEqual(result.map(i => i.params[0]), attributes);
    } else {
      t.falsy(result);
    }
    requestCalledOnceWith(t, user.client, 'getUser', { AccessToken });
    t.end();
  });
}
addSimpleTitle(getUserAttributesMacro);
test.cb(getUserAttributesMacro, false);
test.cb(getUserAttributesMacro, true);

function deleteAttributesMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  const attributeList = attributes.map(a => a.Name);

  user.deleteAttributes(attributeList, err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'deleteUserAttributes', {
      UserAttributeNames: attributeList,
      AccessToken,
    });
    t.end();
  });
}
addSimpleTitle(deleteAttributesMacro);
test.cb(deleteAttributesMacro, false);
test.cb(deleteAttributesMacro, true);

function resendConfirmationCodeMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  user.resendConfirmationCode(err => {
    t.is(err, expectedError);
    requestCalledOnceWith(t, user.client, 'resendConfirmationCode', { ClientId, Username });
    t.end();
  });
}
addSimpleTitle(resendConfirmationCodeMacro);
test.cb(resendConfirmationCodeMacro, false);
test.cb(resendConfirmationCodeMacro, true);

function forgotPasswordMacro(t, succeeds, usingInputVerificationCode) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const expectedData = !succeeds ? null : { CodeDeliveryDetails };
  const request = [expectedError, expectedData];
  const user = createSignedInUser(request);

  function done() {
    requestCalledOnceWith(t, user.client, 'forgotPassword', { ClientId, Username });
    t.end();
  }

  const callback = !usingInputVerificationCode ?
    createBasicCallback(t, succeeds, expectedError, done) :
    createCallback(t, done, {
      onFailure(err) {
        t.false(succeeds);
        t.is(err, expectedError);
      },
      inputVerificationCode(data) {
        t.true(succeeds);
        t.is(data, expectedData);
      },
    });

  user.forgotPassword(callback);
}
addSimpleTitle(forgotPasswordMacro, {
  context(usingInputVerificationCode) {
    return { usingInputVerificationCode };
  },
});
test.cb(forgotPasswordMacro, false, false);
test.cb(forgotPasswordMacro, true, false);
test.cb(forgotPasswordMacro, false, true);
test.cb(forgotPasswordMacro, true, true);

function confirmPasswordMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  const newPassword = 'swordfish';
  const callback = createBasicCallback(t, succeeds, expectedError, () => {
    requestCalledOnceWith(t, user.client, 'confirmForgotPassword', {
      ClientId,
      Username,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });
    t.end();
  });
  user.confirmPassword(confirmationCode, newPassword, callback);
}
addSimpleTitle(confirmPasswordMacro);
test.cb(confirmPasswordMacro, false);
test.cb(confirmPasswordMacro, true);

function getAttributeVerificationCodeMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const expectedData = !succeeds ? null : { CodeDeliveryDetails };
  const user = createSignedInUser([expectedError, expectedData]);

  function done() {
    requestCalledOnceWith(t, user.client, 'getUserAttributeVerificationCode', {
      AttributeName: attributeName,
      AccessToken,
    });
    t.end();
  }
  user.getAttributeVerificationCode(
    attributeName,
    createCallback(t, done, {
      onFailure(err) {
        t.false(succeeds);
        t.is(err, expectedError);
      },
      inputVerificationCode(data) {
        t.true(succeeds);
        t.is(data, expectedData);
      },
    }));
}
addSimpleTitle(getAttributeVerificationCodeMacro);
test.cb(getAttributeVerificationCodeMacro, false);
test.cb(getAttributeVerificationCodeMacro, true);

function verifyAttributeMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);

  const callback = createBasicCallback(t, succeeds, expectedError, () => {
    requestCalledOnceWith(t, user.client, 'verifyUserAttribute', {
      AttributeName: attributeName,
      Code: confirmationCode,
      AccessToken,
    });
    t.end();
  });
  user.verifyAttribute(attributeName, confirmationCode, callback);
}
addSimpleTitle(verifyAttributeMacro);
test.cb(verifyAttributeMacro, false);
test.cb(verifyAttributeMacro, true);

function getDeviceMacro(t, succeeds) {
  const expectedError = createExpectedErrorFromSuccess(succeeds);
  const user = createSignedInUserWithExpectedError(expectedError);
  const expectedDeviceKey = 'some-device-key';
  user.deviceKey = expectedDeviceKey;

  const callback = createBasicCallback(t, succeeds, expectedError, () => {
    requestCalledOnceWith(t, user.client, 'getDevice', {
      AccessToken,
      DeviceKey: expectedDeviceKey,
    });
    t.end();
  });
  user.getDevice(callback);
}
addSimpleTitle(getDeviceMacro);
test.cb(getDeviceMacro, false);
test.cb(getDeviceMacro, true);
