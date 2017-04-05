/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';
import { BigInteger } from 'jsbn';
import { codec } from 'sjcl';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestSucceedsWith,
  requestFailsWith,
  createCallback,
  title,
} from './_helpers.test';

function hexToBase64(hex) {
  return codec.base64.fromBits(codec.hex.toBits(hex));
}

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
const SaltDevicesBase64 = hexToBase64(SaltDevicesHex);
const VerifierDevicesHex = 'ed'.repeat(32);
const VerifierDevicesBase64 = hexToBase64(VerifierDevicesHex);
const RandomPasswordHex = 'a0'.repeat(32);
const ValidationData = [
  { Name: 'some-name-1', Value: 'some-value-1' },
  { Name: 'some-name-2', Value: 'some-value-2' },
];

const dateNow = 'Wed Sep 21 07:36:54 UTC 2016';

const keyPrefix = `CognitoIdentityServiceProvider.${ClientId}`;
const idTokenKey = `${keyPrefix}.${aliasUsername}.idToken`;
const accessTokenKey = `${keyPrefix}.${aliasUsername}.accessToken`;
const refreshTokenKey = `${keyPrefix}.${aliasUsername}.refreshToken`;
const lastAuthUserKey = `${keyPrefix}.LastAuthUser`;
const deviceKeyKey = `${keyPrefix}.${aliasUsername}.deviceKey`;
const randomPasswordKey = `${keyPrefix}.${aliasUsername}.randomPasswordKey`;
const deviceGroupKeyKey = `${keyPrefix}.${aliasUsername}.deviceGroupKey`;

const oldDeviceKey = 'old-deviceKey';

const cachedDeviceKey = 'cached-deviceKey';
const cachedRandomPassword = 'cached-randomPassword';
const cachedDeviceGroupKey = 'cached-deviceGroup';

const newDeviceKey = 'new-deviceKey';
const newDeviceGroupKey = 'new-deviceGroup';
const deviceName = 'some-device-name';

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

function createRespondToAuthChallengeResponseForSuccess({ hasNewDevice } = {}) {
  const response = {
    AuthenticationResult: { IdToken, AccessToken, RefreshToken },
  };

  if (hasNewDevice) {
    response.AuthenticationResult.NewDeviceMetadata = {
      DeviceGroupKey: newDeviceGroupKey,
      DeviceKey: newDeviceKey,
    };
  }

  return response;
}

function createRespondToAuthChallengeResponseForChallenge(challengeName) {
  return {
    ChallengeName: challengeName,
    Session: `respondToAuthChallenge-${challengeName}-session`,
  };
}

function createRespondToAuthChallengeResponseForCustomChallenge() {
  return Object.assign(
    createRespondToAuthChallengeResponseForChallenge('CUSTOM_CHALLENGE'),
    {
      ChallengeParameters: {
        Name: 'some-custom-challenge-parameter',
      },
    }
  );
}

function assertHasSetSignInSession(t, user) {
  const userSession = user.getSignInUserSession();
  t.is(userSession.getIdToken().getJwtToken(), IdToken);
  t.is(userSession.getAccessToken().getJwtToken(), AccessToken);
  t.is(userSession.getRefreshToken().getToken(), RefreshToken);
}

function assertHasDeviceState(t, user, { hasOldDevice, hasCachedDevice, hasNewDevice }) {
  let expectedDeviceKey;
  let expectedRandomPassword;
  let expectedDeviceGroupKey;

  if (hasOldDevice) {
    expectedDeviceKey = oldDeviceKey;
  }

  if (hasCachedDevice) {
    expectedDeviceKey = cachedDeviceKey;
    expectedRandomPassword = cachedRandomPassword;
    expectedDeviceGroupKey = cachedDeviceGroupKey;
  }

  if (hasNewDevice) {
    expectedDeviceKey = newDeviceKey;
    expectedRandomPassword = RandomPasswordHex;
    expectedDeviceGroupKey = newDeviceGroupKey;
  }

  // FIXME: AuthenticationHelper.getVerifierDevices() returns hex, but CognitoUser expects sjcl bits
  t.skip.is(user.verifierDevices, VerifierDevicesBase64);
  t.is(user.deviceGroupKey, expectedDeviceGroupKey);
  t.is(user.randomPassword, expectedRandomPassword);
  t.is(user.deviceKey, expectedDeviceKey);
}

function assertDidCacheTokens(t, localStorage) {
  t.is(localStorage.setItem.withArgs(idTokenKey).callCount, 1);
  t.is(localStorage.setItem.withArgs(accessTokenKey).callCount, 1);
  t.is(localStorage.setItem.withArgs(refreshTokenKey).callCount, 1);
  t.is(localStorage.setItem.withArgs(lastAuthUserKey).callCount, 1);
  t.is(localStorage.setItem.withArgs(idTokenKey).args[0][1], IdToken);
  t.is(localStorage.setItem.withArgs(accessTokenKey).args[0][1], AccessToken);
  t.is(localStorage.setItem.withArgs(refreshTokenKey).args[0][1], RefreshToken);
  t.is(localStorage.setItem.withArgs(lastAuthUserKey).args[0][1], aliasUsername);
}

function assertDidCacheDeviceKeyAndPassword(t, localStorage) {
  t.is(localStorage.setItem.withArgs(deviceKeyKey, newDeviceKey).callCount, 1);
  t.is(localStorage.setItem.withArgs(randomPasswordKey, RandomPasswordHex).callCount, 1);
  t.is(localStorage.setItem.withArgs(deviceGroupKeyKey, newDeviceGroupKey).callCount, 1);
}

function assertDidNotCacheDeviceKeyAndPassword(t, localStorage) {
  t.is(localStorage.setItem.withArgs(deviceKeyKey).callCount, 0);
  t.is(localStorage.setItem.withArgs(randomPasswordKey).callCount, 0);
  t.is(localStorage.setItem.withArgs(deviceGroupKeyKey).callCount, 0);
}

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
    return codec.hex.toBits('a4'.repeat(32));
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

class MockResultBase {
  constructor(...params) {
    this.params = params;
  }
}

class MockCognitoTokenBase extends MockResultBase {}
class MockCognitoAccessToken extends MockCognitoTokenBase {
  getJwtToken() {
    return this.params[0].AccessToken;
  }
}
class MockCognitoIdToken extends MockCognitoTokenBase {
  getJwtToken() {
    return this.params[0].IdToken;
  }
}
class MockCognitoRefreshToken extends MockCognitoTokenBase {
  getToken() {
    return this.params[0].RefreshToken;
  }
}
class MockCognitoUserSession extends MockResultBase {
  getAccessToken() {
    return this.params[0].AccessToken;
  }

  getIdToken() {
    return this.params[0].IdToken;
  }

  getRefreshToken() {
    return this.params[0].RefreshToken;
  }
}

function createUser({ pool = new MockUserPool() } = {}, ...requestConfigs) {
  pool.client = new MockClient(...requestConfigs); // eslint-disable-line no-param-reassign
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', {
    './AuthenticationHelper': MockAuthenticationHelper,
    './CognitoAccessToken': MockCognitoAccessToken,
    './CognitoIdToken': MockCognitoIdToken,
    './CognitoRefreshToken': MockCognitoRefreshToken,
    './CognitoUserSession': MockCognitoUserSession,
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
  global.navigator = { userAgent: deviceName };
  const expectedError = { code: 'InternalServerError' };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(createRespondToAuthChallengeResponseForSuccess({ hasNewDevice: true })),
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

function deviceStateSuccessMacro(
  t,
  { hasOldDevice, hasCachedDevice, hasNewDevice, userConfirmationNecessary }
) {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  let extraExpectedChallengeResponses;

  if (hasOldDevice) {
    extraExpectedChallengeResponses = {
      DEVICE_KEY: oldDeviceKey,
    };
  }

  if (hasCachedDevice) {
    localStorage.getItem.withArgs(deviceKeyKey).returns(cachedDeviceKey);
    localStorage.getItem.withArgs(randomPasswordKey).returns(cachedRandomPassword);
    localStorage.getItem.withArgs(deviceGroupKeyKey).returns(cachedDeviceGroupKey);

    extraExpectedChallengeResponses = {
      DEVICE_KEY: cachedDeviceKey,
    };
  }

  if (hasNewDevice) {
    global.navigator = { userAgent: deviceName };
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
      Salt: SaltDevicesBase64,
      PasswordVerifier: VerifierDevicesBase64,
    },
    DeviceName: deviceName,
  };

  const requests = [
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(createRespondToAuthChallengeResponseForSuccess({ hasNewDevice })),
  ];

  if (hasNewDevice) {
    requests.push(
      requestSucceedsWith({
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

        t.is(user.getUsername(), aliasUsername);
        t.is(user.Session, null);

        assertHasDeviceState(t, user, { hasOldDevice, hasCachedDevice, hasNewDevice });

        assertHasSetSignInSession(t, user);
        assertDidCacheTokens(t, localStorage);

        if (hasNewDevice) {
          assertDidCacheDeviceKeyAndPassword(t, localStorage);
        } else {
          assertDidNotCacheDeviceKeyAndPassword(t, localStorage);
        }
      },
    }));
}
deviceStateSuccessMacro.title = (_, context) => (
  title(null, { context, outcome: 'creates session' })
);

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

  const expectedInitiateAuthArgs = createExpectedInitiateAuthArgs({
    AuthFlow: 'CUSTOM_AUTH',
    extraAuthParameters: {
      CHALLENGE_NAME: 'SRP_A',
    },
  });

  const expectedRespondToAuthChallengeArgs =
    createExpectedRespondToAuthChallengePasswordVerifierArgs();

  const respondToAuthChallengeResponse =
    createRespondToAuthChallengeResponseForCustomChallenge();

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengeResponse));

  user.setAuthenticationFlowType('CUSTOM_AUTH');

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      customChallenge(parameters) {
        t.deepEqual(parameters, respondToAuthChallengeResponse.ChallengeParameters);

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

  const respondToAuthChallengeResponse =
    createRespondToAuthChallengeResponseForChallenge('SMS_MFA');

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
    requestSucceedsWith(createRespondToAuthChallengeResponseForChallenge('DEVICE_SRP_AUTH')),
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
      requestSucceedsWith(createRespondToAuthChallengeResponseForChallenge('DEVICE_SRP_AUTH')),
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
    createRespondToAuthChallengeResponseForChallenge('DEVICE_SRP_AUTH');

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
    requestSucceedsWith(createRespondToAuthChallengeResponseForSuccess())
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

        assertHasSetSignInSession(t, user);
        assertDidCacheTokens(t, localStorage);
        assertDidNotCacheDeviceKeyAndPassword(t, localStorage);
      },
    }));
});

test.cb('sendCustomChallengeAnswer() :: fails => raises onFailure', t => {
  const expectedError = { code: 'InternalServerError' };
  const previousChallengeSession = 'previous-challenge-session';

  const user = createUser({}, requestFailsWith(expectedError));
  user.Session = previousChallengeSession;

  const answerChallenge = 'some-answer-challenge';
  user.sendCustomChallengeAnswer(answerChallenge, createCallback(t, t.end, {
    onFailure(err) {
      t.is(err, expectedError);

      t.is(user.client.requestCallCount, 1);
      t.is(user.client.getRequestCallArgs(0).name, 'respondToAuthChallenge');
      t.deepEqual(user.client.getRequestCallArgs(0).args, {
        ChallengeName: 'CUSTOM_CHALLENGE',
        ChallengeResponses: {
          USERNAME: constructorUsername,
          ANSWER: answerChallenge,
        },
        ClientId,
        Session: previousChallengeSession,
      });

      t.is(user.getUsername(), constructorUsername);
      t.is(user.Session, previousChallengeSession);
    },
  }));
});

test.cb(
  'sendCustomChallengeAnswer() :: CUSTOM_CHALLENGE challenge => raises customChallenge',
  t => {
    const respondToAuthChallengeResponse =
      createRespondToAuthChallengeResponseForCustomChallenge();
    const previousChallengeSession = 'previous-challenge-session';

    const user = createUser({}, requestSucceedsWith(respondToAuthChallengeResponse));
    user.Session = previousChallengeSession;

    const answerChallenge = 'some-answer-challenge';
    user.sendCustomChallengeAnswer(answerChallenge, createCallback(t, t.end, {
      customChallenge(challengeParameters) {
        // Looks like a bug: Uses response `challengeParameters` not `ChallengeParameters` like
        // authenticateUser() does.
        t.skip.is(challengeParameters, respondToAuthChallengeResponse.ChallengeParameters);

        t.is(user.client.requestCallCount, 1);
        t.is(user.client.getRequestCallArgs(0).name, 'respondToAuthChallenge');
        t.deepEqual(user.client.getRequestCallArgs(0).args, {
          ChallengeName: 'CUSTOM_CHALLENGE',
          ChallengeResponses: {
            USERNAME: constructorUsername,
            ANSWER: answerChallenge,
          },
          ClientId,
          Session: previousChallengeSession,
        });

        t.is(user.getUsername(), constructorUsername);
        t.is(user.Session, respondToAuthChallengeResponse.Session);
      },
    }));
  });

test.serial.cb('sendCustomChallengeAnswer() :: succeeds => creates session', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };
  const respondToAuthChallengeResponse =
    createRespondToAuthChallengeResponseForSuccess();

  const previousChallengeSession = 'previous-challenge-session';

  const user = createUser({}, requestSucceedsWith(respondToAuthChallengeResponse));
  user.username = aliasUsername; // assertDidCacheTokens() expects this
  user.Session = previousChallengeSession;

  const answerChallenge = 'some-answer-challenge';

  user.sendCustomChallengeAnswer(answerChallenge, createCallback(t, t.end, {
    onSuccess(signInSessionArg) {
      t.is(signInSessionArg, user.getSignInUserSession());

      // check client requests (expanded due to assert string depth limit)
      t.is(user.client.requestCallCount, 1);
      t.is(user.client.getRequestCallArgs(0).name, 'respondToAuthChallenge');
      t.deepEqual(user.client.getRequestCallArgs(0).args, {
        ChallengeName: 'CUSTOM_CHALLENGE',
        ChallengeResponses: {
          USERNAME: aliasUsername,
          ANSWER: answerChallenge,
        },
        ClientId,
        Session: previousChallengeSession,
      });

      // Check user state
      t.is(user.getUsername(), aliasUsername);
      t.skip.is(user.Session, null); // FIXME: should be clearing Session like authenticateUser()

      assertHasSetSignInSession(t, user);
      assertDidCacheTokens(t, localStorage);
      assertDidNotCacheDeviceKeyAndPassword(t, localStorage);
    },
  }));
});

test.cb('sendMFACode() :: fails on respondToAuthChallenge => raises onFailure', t => {
  const expectedError = { code: 'InternalServerError' };
  const previousChallengeSession = 'previous-challenge-session';

  const user = createUser({}, requestFailsWith(expectedError));
  user.Session = previousChallengeSession;

  const confirmationCode = 'some-confirmation-code';
  user.sendMFACode(confirmationCode, createCallback(t, t.end, {
    onFailure(err) {
      t.is(err, expectedError);

      t.is(user.getUsername(), constructorUsername);
      t.is(user.Session, previousChallengeSession);
    },
  }));
});

test.serial.cb('sendMFACode() :: fails on confirmDevice => raises onFailure', t => {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const expectedError = { code: 'InternalServerError' };

  const respondToAuthChallengeResponse = createRespondToAuthChallengeResponseForSuccess({
    hasNewDevice: true,
  });

  const previousChallengeSession = 'previous-challenge-session';

  const user = createUser(
    {},
    requestSucceedsWith(respondToAuthChallengeResponse),
    requestFailsWith(expectedError));
  user.Session = previousChallengeSession;

  const confirmationCode = 'some-confirmation-code';
  user.sendMFACode(confirmationCode, createCallback(t, t.end, {
    onFailure(err) {
      t.is(err, expectedError);
    },
  }));
});

function sendMFACodeSucceedsMacro(t, { hasOldDevice, hasNewDevice, userConfirmationNecessary }) {
  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const previousChallengeSession = 'previous-challenge-session';
  const confirmationCode = 'some-confirmation-code';

  const expectedRespondToAuthChallengeArgs = {
    ChallengeName: 'SMS_MFA',
    ChallengeResponses: {
      USERNAME: aliasUsername,
      SMS_MFA_CODE: confirmationCode,
    },
    ClientId,
    Session: previousChallengeSession,
  };

  if (hasOldDevice) {
    expectedRespondToAuthChallengeArgs.ChallengeResponses.DEVICE_KEY = oldDeviceKey;
  }

  const user = createUser(
    {},
    requestSucceedsWith(createRespondToAuthChallengeResponseForSuccess({ hasNewDevice })),
    requestSucceedsWith({
      UserConfirmationNecessary: userConfirmationNecessary,
    }));

  user.username = aliasUsername; // assertDidCacheTokens() expects this
  user.Session = previousChallengeSession;

  if (hasOldDevice) {
    user.deviceKey = oldDeviceKey;
  }

  user.sendMFACode(confirmationCode, createCallback(t, t.end, {
    onSuccess(signInUserSessionArg, userConfirmationNecessaryArg) {
      t.is(signInUserSessionArg, user.getSignInUserSession());
      if (userConfirmationNecessary) {
        t.true(userConfirmationNecessaryArg);
      } else {
        t.falsy(userConfirmationNecessaryArg);
      }

      t.is(user.client.requestCallCount, hasNewDevice ? 2 : 1);
      t.is(user.client.getRequestCallArgs(0).name, 'respondToAuthChallenge');
      t.deepEqual(user.client.getRequestCallArgs(0).args, expectedRespondToAuthChallengeArgs);
      if (hasNewDevice) {
        t.is(user.client.getRequestCallArgs(1).name, 'confirmDevice');
        t.deepEqual(user.client.getRequestCallArgs(1).args, {
          DeviceKey: newDeviceKey,
          AccessToken,
          DeviceSecretVerifierConfig: {
            Salt: SaltDevicesBase64,
            PasswordVerifier: VerifierDevicesBase64,
          },
          DeviceName: deviceName,
        });
      }

      t.is(user.getUsername(), aliasUsername);
      t.is(user.Session, previousChallengeSession);

      assertHasDeviceState(t, user, { hasOldDevice, hasNewDevice });

      assertDidCacheTokens(t, localStorage);
      if (hasNewDevice) {
        assertDidCacheDeviceKeyAndPassword(t, localStorage);
      } else {
        assertDidNotCacheDeviceKeyAndPassword(t, localStorage);
      }
    },
  }));
}
sendMFACodeSucceedsMacro.title = (_, context) => (
  title('sendMFACode', { context, outcome: 'creates session' })
);

for (const hasOldDevice of [false, true]) {
  for (const hasNewDevice of [false, true]) {
    test.serial.cb(sendMFACodeSucceedsMacro, { hasOldDevice, hasNewDevice });
  }
}
test.serial.cb(
  sendMFACodeSucceedsMacro,
  { hasNewDevice: true, userConfirmationNecessary: true }
);
