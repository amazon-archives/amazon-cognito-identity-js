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
  requestCalledWithOnCall,
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

const initiateAuthResponse = {
  ChallengeParameters: {
    USER_ID_FOR_SRP: aliasUsername,
    SRP_B: 'cb'.repeat(16),
    SALT: 'a7'.repeat(16),
    SECRET_BLOCK: '0c'.repeat(16),
  },
  Session: 'initiateAuth-session',
};

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

test.cb('initiateAuth fails => raises onFailure', t => {
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
test.serial.cb('respondToAuthChallenge fails => raises onFailure', t => {
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
        t.is(user.getUsername(), initiateAuthResponse.ChallengeParameters.USER_ID_FOR_SRP);
        t.is(user.Session, null);
      },
    }));
});

function completesMacroTitle(t, { flow, hasOldDevice, hasCachedDevice, hasNewDevice }) {
  return [
    `${flow} flow`,
    `${hasOldDevice ? 'with' : 'no'} old`,
    `${hasCachedDevice ? 'with' : 'no'} cached`,
    `${hasNewDevice ? 'with' : 'no'} new device`,
    'completes => creates session',
  ].join(', ');
}
function completesMacro(t, { flow, hasOldDevice, hasCachedDevice, hasNewDevice }) {
  const oldDeviceKey = 'old-deviceKey';

  const cachedDeviceKey = 'cached-deviceKey';
  const cachedRandomPassword = 'cached-randomPassword';
  const cachedDeviceGroupKey = 'cached-deviceGroup';

  const newDeviceKey = 'new-deviceKey';
  const newDeviceGroupKey = 'new-deviceGroup';
  const deviceName = 'some-device-name';

  const expectedInitiateAuthArgs = {
    AuthFlow: flow,
    ClientId,
    AuthParameters: {
      USERNAME: constructorUsername,
      SRP_A: SrpLargeAHex,
    },
    ClientMetadata: ValidationData,
  };
  const expectedRespondToAuthChallengeArgs = {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId,
    ChallengeResponses: {
      USERNAME: aliasUsername,
      PASSWORD_CLAIM_SECRET_BLOCK: initiateAuthResponse.ChallengeParameters.SECRET_BLOCK,
      TIMESTAMP: dateNow,
      PASSWORD_CLAIM_SIGNATURE: 'duUyEsqUdolAO+/KMVp9lS/sxTozKH6rNZ2HlWnfLp4=',
    },
    Session: initiateAuthResponse.Session,
  };
  const expectedConfirmDeviceArgs = {
    DeviceKey: newDeviceKey,
    AccessToken,
    DeviceSecretVerifierConfig: {
      Salt: hexToBase64(SaltDevicesHex),
      PasswordVerifier: hexToBase64(VerifierDevicesHex),
    },
    DeviceName: deviceName,
  };

  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  if (hasNewDevice) {
    global.navigator = {
      userAgent: deviceName,
    };
  }

  const respondToAuthChallengeResponse = {
    ChallengeName: 'PASSWORD_VERIFIER',
    AuthenticationResult: { IdToken, AccessToken, RefreshToken },
    Session: 'respondToAuthChallenge-session',
  };

  const requests = [
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengeResponse),
  ];

  if (hasNewDevice) {
    respondToAuthChallengeResponse.AuthenticationResult.NewDeviceMetadata = {
      DeviceGroupKey: newDeviceGroupKey,
      DeviceKey: newDeviceKey,
    };
    requests.push(
      requestSucceedsWith({
        AuthenticationResult: {
          NewDeviceMetadata: {
            DeviceKey: newDeviceKey,
          },
        },
      }));
  }

  const user = createUser({}, ...requests);
  user.setAuthenticationFlowType(flow);

  let expectedDeviceKey;
  let expectedRandomPassword;
  let expectedDeviceGroupKey;

  if (hasOldDevice) {
    expectedDeviceKey = oldDeviceKey;
    user.deviceKey = oldDeviceKey;

    expectedInitiateAuthArgs.AuthParameters.DEVICE_KEY = oldDeviceKey;
    expectedRespondToAuthChallengeArgs.ChallengeResponses.DEVICE_KEY = oldDeviceKey;
  }

  if (hasCachedDevice) {
    expectedDeviceKey = cachedDeviceKey;
    expectedRandomPassword = cachedRandomPassword;
    expectedDeviceGroupKey = cachedDeviceGroupKey;

    localStorage.getItem.withArgs(deviceKeyKey).returns(cachedDeviceKey);
    localStorage.getItem.withArgs(randomPasswordKey).returns(cachedRandomPassword);
    localStorage.getItem.withArgs(deviceGroupKeyKey).returns(cachedDeviceGroupKey);

    expectedRespondToAuthChallengeArgs.ChallengeResponses.DEVICE_KEY = cachedDeviceKey;
  }

  if (hasNewDevice) {
    expectedDeviceKey = newDeviceKey;
    expectedRandomPassword = RandomPasswordHex;
    expectedDeviceGroupKey = newDeviceGroupKey;
  }

  user.authenticateUser(
    new MockAuthenticationDetails(),
    createCallback(t, t.end, {
      onSuccess() {
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
completesMacro.title = completesMacroTitle;

for (const flow of ['USER_SRP_AUTH']) {
  for (const hasOldDevice of [false, true]) {
    for (const hasCachedDevice of [false, true]) {
      for (const hasNewDevice of [false, true]) {
        test.serial.cb(completesMacro, { flow, hasOldDevice, hasCachedDevice, hasNewDevice });
      }
    }
  }
}

test.todo('USER_SRP_AUTH flow, MFA required => calls mfaRequired');
test.todo('USER_SRP_AUTH flow, custom challenge => calls customChallenge');
// ... other flows

test.todo('getDeviceResponse() :: DEVICE_SRP_AUTH fails => calls onFailure');
test.todo('getDeviceResponse() :: DEVICE_PASSWORD_VERIFIER fails => calls onFailure');
test.todo('getDeviceResponse() :: succeeds => signs in and calls onSuccess');

test.todo('sendCustomChallengeAnswer() :: fails => calls onFailure');
test.todo('sendCustomChallengeAnswer() :: succeeds => calls onSuccess');

