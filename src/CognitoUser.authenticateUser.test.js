/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';
import { BigInteger } from 'jsbn';
import * as sjcl from 'sjcl';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestSucceedsWith,
  requestFailsWith,
  createCallback,
} from './_helpers.test';

const UserPoolId = 'xx-nowhere1_SomeUserPool'; // Constructor validates the format.
const ClientId = 'some-client-id';
const constructorUsername = 'constructor-username';
const aliasUsername = 'initiateAuthResponse-username';
const Password = 'swordfish';
const IdToken = 'some-id-token';
const RefreshToken = 'some-refresh-token';
const AccessToken = 'some-access-token';
const SrpLargeAHex = '1a'.repeat(32);
const SaltDevicesHex = '5d'.repeat(32);
const VerifierDevicesHex = 'ed'.repeat(32);
const RandomPasswordHex = 'a0'.repeat(32);
const ValidationData = [
  { Name: 'some-name-1', Value: 'some-value-1' },
  { Name: 'some-name-2', Value: 'some-value-2' },
];

const dateNow = 'Wed Sep 21 07:36:54 UTC 2016';

function createExpectedInitiateAuthArgs({
  AuthFlow = 'USER_SRP_AUTH',
  extraAuthParameters,
} = {}) {
  const args = {
    AuthFlow,
    ClientId,
    AuthParameters: {
      USERNAME: constructorUsername,
      SRP_A: SrpLargeAHex,
    },
    ClientMetadata: ValidationData,
  };

  if (extraAuthParameters) {
    Object.assign(args.AuthParameters, extraAuthParameters);
  }

  return args;
}

const initiateAuthResponse = {
  ChallengeParameters: {
    USER_ID_FOR_SRP: aliasUsername,
    SRP_B: 'cb'.repeat(16),
    SALT: 'a7'.repeat(16),
    SECRET_BLOCK: '0c'.repeat(16),
  },
  Session: 'initiateAuth-session',
};

function createSrpChallengeResponses(extra) {
  const result = {
    USERNAME: aliasUsername,
    PASSWORD_CLAIM_SECRET_BLOCK: initiateAuthResponse.ChallengeParameters.SECRET_BLOCK,
    TIMESTAMP: dateNow,
    PASSWORD_CLAIM_SIGNATURE: 'duUyEsqUdolAO+/KMVp9lS/sxTozKH6rNZ2HlWnfLp4=',
  };

  if (extra) {
    Object.assign(result, extra);
  }

  return result;
}

function createExpectedRespondToAuthChallengePasswordVerifierArgs(
  { extraChallengeResponses } = {}
) {
  return {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId,
    ChallengeResponses: createSrpChallengeResponses(extraChallengeResponses),
    Session: initiateAuthResponse.Session,
  };
}

function createRespondToAuthChallengeCompleteResponse({ NewDeviceMetadata } = {}) {
  return {
    AuthenticationResult: { IdToken, AccessToken, RefreshToken, NewDeviceMetadata },
  };
}

function createRespondToAuthChallengeChallengeResponse({
  ChallengeName,
  ChallengeParameters,
} = {}) {
  return {
    ChallengeName,
    Session: `respondToAuthChallenge-${ChallengeName}-session`,
    ChallengeParameters,
  };
}

const keyPrefix = `CognitoIdentityServiceProvider.${ClientId}`;
const idTokenKey = `${keyPrefix}.${aliasUsername}.idToken`;
const accessTokenKey = `${keyPrefix}.${aliasUsername}.accessToken`;
const refreshTokenKey = `${keyPrefix}.${aliasUsername}.refreshToken`;
const lastAuthUserKey = `${keyPrefix}.LastAuthUser`;
const deviceKeyKey = `${keyPrefix}.${aliasUsername}.deviceKey`;
const randomPasswordKey = `${keyPrefix}.${aliasUsername}.randomPasswordKey`;
const deviceGroupKeyKey = `${keyPrefix}.${aliasUsername}.deviceGroupKey`;

class MockUserPool {
  constructor() {
    this.client = new MockClient();
  }

  getUserPoolId() {
    return UserPoolId;
  }

  getClientId() {
    return ClientId;
  }

  getParanoia() {
    return 0;
  }

  toJSON() {
    return '[mock UserPool]';
  }
}

class MockAuthenticationHelper {
  getLargeAValue() {
    return new BigInteger(SrpLargeAHex, 16);
  }

  getPasswordAuthenticationKey() {
    return sjcl.codec.hex.toBits('a4'.repeat(32));
  }

  generateHashDevice() {
    // Can't test this nicely as the instance is local to authenticateUser()
  }

  getSaltDevices() {
    return SaltDevicesHex;
  }

  getVerifierDevices() {
    return VerifierDevicesHex;
  }

  getRandomPassword() {
    return RandomPasswordHex;
  }
}

class MockDateHelper {
  getNowString() {
    return dateNow;
  }
}

class MockAuthenticationDetails {
  getPassword() {
    return Password;
  }

  getValidationData() {
    return ValidationData;
  }
}

function hexToBase64(hex) {
  return sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(hex));
}

function createUser({ pool = new MockUserPool() } = {}, ...requestConfigs) {
  pool.client = new MockClient(...requestConfigs); // eslint-disable-line no-param-reassign
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', {
    './AuthenticationHelper': MockAuthenticationHelper,
    './DateHelper': MockDateHelper,
  });
  return new CognitoUser({ Username: constructorUsername, Pool: pool });
}

test.cb('fails on initiateAuth => raises onFailure', t => {
  const expectedError = { code: 'InternalServerError' };

  const user = createUser({}, requestFailsWith(expectedError));

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onFailure(err) {
        t.is(err, expectedError);
      },
    }));
});

// .serial for global.window stompage
test.serial.cb('fails on respondToAuthChallenge => raises onFailure', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const expectedError = { code: 'InternalServerError' };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestFailsWith(expectedError));

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onFailure(err) {
        t.is(err, expectedError);
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);
      },
    }));
});

test.serial.cb('with new device state, fails on confirmDevice => raises onFailure', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };
  global.navigator = { userAgent: 'some-device-name' };
  const expectedError = { code: 'InternalServerError' };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(createRespondToAuthChallengeCompleteResponse({
      NewDeviceMetadata: {
        DeviceGroupKey: 'new-deviceGroup',
        DeviceKey: 'new-deviceKey',
      },
    })),
    requestFailsWith(expectedError)
  );

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onFailure(err) {
        t.is(err, expectedError);
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);
      },
    }));
});

function deviceStateSuccessMacroTitle(
  t,
  { hasOldDevice, hasCachedDevice, hasNewDevice, userConfirmationNecessary }
) {
  const context = [
    `${hasOldDevice ? 'with' : 'no'} old`,
    `${hasCachedDevice ? 'with' : 'no'} cached`,
    `${hasNewDevice ? 'with' : 'no'} new device state`,
  ];

  if (userConfirmationNecessary) {
    context.push('user confirmation necessary');
  }

  return `${context.join(', ')} => creates session`;
}

function deviceStateSuccessMacro(
  t,
  { hasOldDevice, hasCachedDevice, hasNewDevice, userConfirmationNecessary }
) {
  const oldDeviceKey = 'old-deviceKey';

  const cachedDeviceKey = 'cached-deviceKey';
  const cachedRandomPassword = 'cached-randomPassword';
  const cachedDeviceGroupKey = 'cached-deviceGroup';

  const newDeviceKey = 'new-deviceKey';
  const newDeviceGroupKey = 'new-deviceGroup';
  const deviceName = 'some-device-name';

  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  let expectedDeviceKey;
  let expectedRandomPassword;
  let expectedDeviceGroupKey;
  let extraExpectedChallengeResponses;

  if (hasOldDevice) {
    expectedDeviceKey = oldDeviceKey;

    extraExpectedChallengeResponses = {
      DEVICE_KEY: oldDeviceKey,
    };
  }

  if (hasCachedDevice) {
    expectedDeviceKey = cachedDeviceKey;
    expectedRandomPassword = cachedRandomPassword;
    expectedDeviceGroupKey = cachedDeviceGroupKey;

    localStorage.getItem.withArgs(deviceKeyKey).returns(cachedDeviceKey);
    localStorage.getItem.withArgs(randomPasswordKey).returns(cachedRandomPassword);
    localStorage.getItem.withArgs(deviceGroupKeyKey).returns(cachedDeviceGroupKey);

    extraExpectedChallengeResponses = {
      DEVICE_KEY: cachedDeviceKey,
    };
  }

  if (hasNewDevice) {
    expectedDeviceKey = newDeviceKey;
    expectedRandomPassword = RandomPasswordHex;
    expectedDeviceGroupKey = newDeviceGroupKey;

    global.navigator = {
      userAgent: deviceName,
    };
  }

  const expectedInitiateAuthArgs = createExpectedInitiateAuthArgs({
    extraAuthParameters: hasOldDevice ? { DEVICE_KEY: oldDeviceKey } : {},
  });

  const expectedRespondToAuthChallengeArgs =
    createExpectedRespondToAuthChallengePasswordVerifierArgs({
      extraChallengeResponses: extraExpectedChallengeResponses,
    });

  const expectedConfirmDeviceArgs = {
    DeviceKey: newDeviceKey,
    AccessToken,
    DeviceSecretVerifierConfig: {
      Salt: hexToBase64(SaltDevicesHex),
      PasswordVerifier: hexToBase64(VerifierDevicesHex),
    },
    DeviceName: deviceName,
  };

  const requests = [
    requestSucceedsWith(initiateAuthResponse),
  ];

  if (!hasNewDevice) {
    requests.push(
      requestSucceedsWith(createRespondToAuthChallengeCompleteResponse())
    );
  } else {
    requests.push(
      requestSucceedsWith(createRespondToAuthChallengeCompleteResponse({
        NewDeviceMetadata: {
          DeviceGroupKey: newDeviceGroupKey,
          DeviceKey: newDeviceKey,
        },
      })),
      requestSucceedsWith({
        AuthenticationResult: {
          NewDeviceMetadata: {
            DeviceKey: newDeviceKey,
          },
        },
        UserConfirmationNecessary: userConfirmationNecessary,
      })
    );
  }

  const user = createUser({}, ...requests);

  if (hasOldDevice) {
    user.deviceKey = oldDeviceKey;
  }

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onSuccess(signInUserSessionArg, userConfirmationNecessaryArg) {
        t.is(signInUserSessionArg, user.signInUserSession);
        if (userConfirmationNecessary) {
          t.true(userConfirmationNecessaryArg);
        } else {
          t.falsy(userConfirmationNecessaryArg);
        }

        // check client requests (expanded due to assert string depth limit)
        t.is(user.client.requestCallCount, hasNewDevice ? 3 : 2);
        t.is(user.client.getRequestCallArgs(0).name, 'initiateAuth');
        t.deepEqual(user.client.getRequestCallArgs(0).args, expectedInitiateAuthArgs);
        t.is(user.client.getRequestCallArgs(1).name, 'respondToAuthChallenge');
        t.deepEqual(user.client.getRequestCallArgs(1).args, expectedRespondToAuthChallengeArgs);
        if (hasNewDevice) {
          t.is(user.client.getRequestCallArgs(2).name, 'confirmDevice');
          t.deepEqual(user.client.getRequestCallArgs(2).args, expectedConfirmDeviceArgs);
        }

        // Check user state
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);
        t.is(user.deviceKey, expectedDeviceKey);
        t.is(user.randomPassword, expectedRandomPassword);
        t.is(user.deviceGroupKey, expectedDeviceGroupKey);

        // Check sign-in session
        const userSession = user.getSignInUserSession();
        t.is(userSession.getIdToken().getJwtToken(), IdToken);
        t.is(userSession.getAccessToken().getJwtToken(), AccessToken);
        t.is(userSession.getRefreshToken().getToken(), RefreshToken);

        // check cacheTokens()
        t.is(localStorage.setItem.withArgs(idTokenKey, IdToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(accessTokenKey, AccessToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(refreshTokenKey, RefreshToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(lastAuthUserKey, aliasUsername).callCount, 1);

        // check cacheDeviceKeyAndPassword()
        if (hasNewDevice) {
          t.is(localStorage.setItem.withArgs(deviceKeyKey, newDeviceKey).callCount, 1);
          t.is(localStorage.setItem.withArgs(randomPasswordKey, RandomPasswordHex).callCount, 1);
          t.is(localStorage.setItem.withArgs(deviceGroupKeyKey, newDeviceGroupKey).callCount, 1);
        } else {
          t.is(localStorage.setItem.withArgs(deviceKeyKey).callCount, 0);
          t.is(localStorage.setItem.withArgs(randomPasswordKey).callCount, 0);
          t.is(localStorage.setItem.withArgs(deviceGroupKeyKey).callCount, 0);
        }
      },
    }));
}
deviceStateSuccessMacro.title = deviceStateSuccessMacroTitle;

for (const hasOldDevice of [false, true]) {
  for (const hasCachedDevice of [false, true]) {
    for (const hasNewDevice of [false, true]) {
      test.serial.cb(deviceStateSuccessMacro, { hasOldDevice, hasCachedDevice, hasNewDevice });
    }
  }
}

test.serial.cb(deviceStateSuccessMacro, { hasNewDevice: true, userConfirmationNecessary: true });

test.serial.cb('CUSTOM_AUTH flow, CUSTOM_CHALLENGE challenge => raises customChallenge', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const expectedChallengeParameters = {
    Name: 'some-custom-challenge-parameter',
  };

  const expectedInitiateAuthArgs = createExpectedInitiateAuthArgs({
    AuthFlow: 'CUSTOM_AUTH',
    extraAuthParameters: {
      CHALLENGE_NAME: 'SRP_A',
    },
  });

  const expectedRespondToAuthChallengeArgs =
    createExpectedRespondToAuthChallengePasswordVerifierArgs();

  const respondToAuthChallengeResponse = createRespondToAuthChallengeChallengeResponse({
    ChallengeName: 'CUSTOM_CHALLENGE',
    ChallengeParameters: expectedChallengeParameters,
  });

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengeResponse));

  user.setAuthenticationFlowType('CUSTOM_AUTH');

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      customChallenge(parameters) {
        t.deepEqual(parameters, expectedChallengeParameters);

        // check client requests (expanded due to assert string depth limit)
        t.is(user.client.requestCallCount, 2);
        t.is(user.client.getRequestCallArgs(0).name, 'initiateAuth');
        t.deepEqual(user.client.getRequestCallArgs(0).args, expectedInitiateAuthArgs);
        t.is(user.client.getRequestCallArgs(1).name, 'respondToAuthChallenge');
        t.deepEqual(user.client.getRequestCallArgs(1).args, expectedRespondToAuthChallengeArgs);

        // Check user state
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, respondToAuthChallengeResponse.Session);
      },
    }));
});

test.serial.cb('SMS_MFA challenge => raises mfaRequired', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const expectedInitiateAuthArgs = createExpectedInitiateAuthArgs();

  const expectedRespondToAuthChallengeArgs =
    createExpectedRespondToAuthChallengePasswordVerifierArgs();

  const respondToAuthChallengeResponse = createRespondToAuthChallengeChallengeResponse({
    ChallengeName: 'SMS_MFA',
  });

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengeResponse));

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      mfaRequired() {
        // check client requests (expanded due to assert string depth limit)
        t.is(user.client.requestCallCount, 2);
        t.is(user.client.getRequestCallArgs(0).name, 'initiateAuth');
        t.deepEqual(user.client.getRequestCallArgs(0).args, expectedInitiateAuthArgs);
        t.is(user.client.getRequestCallArgs(1).name, 'respondToAuthChallenge');
        t.deepEqual(user.client.getRequestCallArgs(1).args, expectedRespondToAuthChallengeArgs);

        // Check user state
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, respondToAuthChallengeResponse.Session);
      },
    }));
});

test.serial.cb('DEVICE_SRP_AUTH challenge, fails on DEVICE_SRP_AUTH => raises onFailure', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const expectedError = { code: 'InternalServerError' };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(createRespondToAuthChallengeChallengeResponse({
      ChallengeName: 'DEVICE_SRP_AUTH',
    })),
    requestFailsWith(expectedError));

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onFailure(err) {
        t.is(err, expectedError);

        // Check user state
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);
      },
    }));
});

test.serial.cb(
  'DEVICE_SRP_AUTH challenge, fails on DEVICE_PASSWORD_VERIFIER fails => raises onFailure',
  t => {
    const localStorage = {
      getItem: stub().returns(null),
      setItem: stub(),
    };
    global.window = { localStorage };

    const expectedError = { code: 'InternalServerError' };

    const user = createUser(
      {},
      requestSucceedsWith(initiateAuthResponse),
      requestSucceedsWith(createRespondToAuthChallengeChallengeResponse({
        ChallengeName: 'DEVICE_SRP_AUTH',
      })),
      requestSucceedsWith({
        ChallengeParameters: initiateAuthResponse.ChallengeParameters,
      }),
      requestFailsWith(expectedError));

    user.authenticateUser(
      new MockAuthenticationDetails(),
      createCallback(t, t.end, {
        onFailure(err) {
          t.is(err, expectedError);

          // Check user state
          t.is(user.getUsername(), aliasUsername);
          t.is(user.Session, null);
        },
      }));
  });

test.serial.cb('DEVICE_SRP_AUTH challenge, succeeds => creates session', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  // The PASSWORD_CLAIM_SIGNATURE depends on these values
  const deviceGroupKey = 'cached-deviceGroupKey';
  const randomPassword = 'cached-randomPassword';
  const deviceKey = 'cached-deviceKey';

  localStorage.getItem.withArgs(deviceKeyKey).returns(deviceKey);
  localStorage.getItem.withArgs(randomPasswordKey).returns(randomPassword);
  localStorage.getItem.withArgs(deviceGroupKeyKey).returns(deviceGroupKey);

  const expectedInitiateAuthArgs = createExpectedInitiateAuthArgs();

  const expectedRespondToAuthChallengePasswordVerifierArgs =
    createExpectedRespondToAuthChallengePasswordVerifierArgs({
      extraChallengeResponses: {
        DEVICE_KEY: deviceKey,
      },
    });

  const respondToAuthChallengePasswordVerifierResponse =
    createRespondToAuthChallengeChallengeResponse({
      ChallengeName: 'DEVICE_SRP_AUTH',
    });

  // FIXME: should be using a separate set of AuthenticationHelper mock results.
  const expectedRespondToAuthChallengeDeviceSrpAuthArgs = {
    ChallengeName: 'DEVICE_SRP_AUTH',
    ClientId,
    ChallengeResponses: {
      USERNAME: aliasUsername,
      DEVICE_KEY: deviceKey,
      SRP_A: SrpLargeAHex,
    },
  };

  const respondToAuthChallengeDeviceSrpAuthResponse = {
    ChallengeParameters: initiateAuthResponse.ChallengeParameters,
    Session: 'respondToAuthChallenge-DEVICE_SRP_AUTH-session',
  };

  const expectedRespondToAuthChallengeDevicePasswordVerifierArgs = {
    ChallengeName: 'DEVICE_PASSWORD_VERIFIER',
    ClientId,
    ChallengeResponses: createSrpChallengeResponses({
      PASSWORD_CLAIM_SIGNATURE: 'ZkW+a3yZRihjvIXY0pKfKzIozqXvsw/2LaOXGDN3vo8=',
      DEVICE_KEY: deviceKey,
    }),
    Session: respondToAuthChallengeDeviceSrpAuthResponse.Session,
  };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengePasswordVerifierResponse),
    requestSucceedsWith(respondToAuthChallengeDeviceSrpAuthResponse),
    requestSucceedsWith(createRespondToAuthChallengeCompleteResponse())
  );

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onSuccess() {
        // check client requests (expanded due to assert string depth limit)
        t.is(user.client.requestCallCount, 4);
        t.is(user.client.getRequestCallArgs(0).name, 'initiateAuth');
        t.deepEqual(user.client.getRequestCallArgs(0).args, expectedInitiateAuthArgs);
        t.is(user.client.getRequestCallArgs(1).name, 'respondToAuthChallenge');
        t.deepEqual(
          user.client.getRequestCallArgs(1).args,
          expectedRespondToAuthChallengePasswordVerifierArgs
        );
        t.is(user.client.getRequestCallArgs(2).name, 'respondToAuthChallenge');
        t.deepEqual(
          user.client.getRequestCallArgs(2).args,
          expectedRespondToAuthChallengeDeviceSrpAuthArgs
        );
        t.is(user.client.getRequestCallArgs(3).name, 'respondToAuthChallenge');
        t.deepEqual(
          user.client.getRequestCallArgs(3).args,
          expectedRespondToAuthChallengeDevicePasswordVerifierArgs
        );

        // Check user state
        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);
        t.is(user.deviceKey, deviceKey);
        t.is(user.randomPassword, randomPassword);
        t.is(user.deviceGroupKey, deviceGroupKey);

        // Check sign-in session
        const userSession = user.getSignInUserSession();
        t.is(userSession.getIdToken().getJwtToken(), IdToken);
        t.is(userSession.getAccessToken().getJwtToken(), AccessToken);
        t.is(userSession.getRefreshToken().getToken(), RefreshToken);

        // check cacheTokens()
        t.is(localStorage.setItem.withArgs(idTokenKey, IdToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(accessTokenKey, AccessToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(refreshTokenKey, RefreshToken).callCount, 1);
        t.is(localStorage.setItem.withArgs(lastAuthUserKey, aliasUsername).callCount, 1);

        // check cacheDeviceKeyAndPassword()
        t.is(localStorage.setItem.withArgs(deviceKeyKey).callCount, 0);
        t.is(localStorage.setItem.withArgs(randomPasswordKey).callCount, 0);
        t.is(localStorage.setItem.withArgs(deviceGroupKeyKey).callCount, 0);
      },
    }));
});

test.todo('sendCustomChallengeAnswer() :: fails => raises onFailure');
test.todo('sendCustomChallengeAnswer() :: succeeds => raises onSuccess');

test.todo('sendMFACode() :: fails => raises onFailure');
test.todo('sendMFACode() :: succeeds => raises onSuccess');

