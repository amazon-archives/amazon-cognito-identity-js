/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestCalledOnceWith,
  createCallback,
  createBasicCallback,
  title,
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


function testSpec({
  title: macroTitle,
  cb = true,
  serial = false,
  macro,
  cases = [
    [false],
    [true],
  ],
}) {
  if (typeof macroTitle === 'string') {
    // eslint-disable-next-line no-param-reassign
    macro.title = (_, succeeds) => title(macroTitle, { succeeds });
  } else if (typeof macroTitle === 'function') {
    // eslint-disable-next-line no-param-reassign
    macro.title = (_, ...args) => macroTitle(...args);
  } else {
    // eslint-disable-next-line no-param-reassign
    macro.title = (_, succeeds, ...values) => (
      title(macroTitle.name, {
        succeeds,
        args: macroTitle.args && macroTitle.args(...values),
        context: macroTitle.context && macroTitle.context(...values),
      })
    );
  }
  let testMethod = test;
  if (cb) {
    testMethod = testMethod.cb;
  }
  if (serial) {
    testMethod = testMethod.serial;
  }
  for (const testCase of cases) {
    testMethod(macro, ...testCase);
  }
}


testSpec({
  title(data) {
    return title('constructor', { args: data, outcome: 'throws "required"' });
  },
  cb: false,
  macro(t, data) {
    const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser');
    t.throws(() => new CognitoUser(data), /required/);
  },
  cases: [
    [null],
    [{}],
    [{ Username: null, Pool: null }],
    [{ Username: null, Pool: new MockUserPool() }],
    [{ Username, Pool: null }],
  ],
});

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

testSpec({
  title(forceAliasCreation, succeeds) {
    return title('confirmRegistration', { succeeds, args: { forceAliasCreation } });
  },
  macro(t, forceAliasCreation, succeeds) {
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
  },
  cases: [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ],
});

testSpec({
  title: 'changePassword',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'enableMFA',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'disableMFA',
  macro(t, succeeds) {
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
  },
});


testSpec({
  title: 'deleteUser',
  serial: true,
  macro(t, succeeds) {
    const localStorage = {
      removeItem: stub(),
    };
    global.window = { localStorage };

    const expectedError = createExpectedErrorFromSuccess(succeeds);
    const user = createSignedInUserWithExpectedError(expectedError);

    user.deleteUser(err => {
      t.is(err, expectedError);
      requestCalledOnceWith(t, user.client, 'deleteUser', { AccessToken });
      t.end();
    });
  },
});

testSpec({
  title: 'updateAttributes',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'getUserAttributes',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'deleteUserAttributes',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'resendConfirmationCode',
  macro(t, succeeds) {
    const expectedError = createExpectedErrorFromSuccess(succeeds);
    const user = createSignedInUserWithExpectedError(expectedError);

    user.resendConfirmationCode(err => {
      t.is(err, expectedError);
      requestCalledOnceWith(t, user.client, 'resendConfirmationCode', { ClientId, Username });
      t.end();
    });
  },
});

testSpec({
  title: {
    name: 'forgotPassword',
    context(usingInputVerificationCode) {
      return { usingInputVerificationCode };
    },
  },
  macro(t, succeeds, usingInputVerificationCode) {
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
  },
  cases: [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ],
});

testSpec({
  title: 'confirmPassword',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'getAttributeVerificationCode',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'verifyAttribute',
  macro(t, succeeds) {
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
  },
});

testSpec({
  title: 'getDevice',
  macro(t, succeeds) {
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
  },
});
