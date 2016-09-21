/* eslint-disable require-jsdoc */

import test from 'ava';
import { stub } from 'sinon';
import { BigInteger } from 'jsbn';
import * as sjcl from 'sjcl';

import {
  MockClient,
  requireDefaultWithModuleMocks,
  requestSucceedsWith,
  createCallback,
  requestCalledWithOnCall,
} from './_helpers.test';

import AuthenticationDetails from './AuthenticationDetails';

const UserPoolId = 'xx-nowhere1_SomeUserPool'; // Constructor validates the format.
const ClientId = 'some-client-id';
const Username = 'some-username';
const Password = 'swordfish';
const IdToken = 'some-id-token';
const RefreshToken = 'some-refresh-token';
const AccessToken = 'some-access-token';
const SrpLargeAHex = '1a'.repeat(32);
const ValidationData = [
  { Name: 'some-name-1', Value: 'some-value-1' },
  { Name: 'some-name-2', Value: 'some-value-2' },
];

const dateNow = 'Wed Sep 21 07:36:54 UTC 2016';

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
}

class MockDateHelper {
  getNowString() {
    return dateNow;
  }
}

function createUser({ pool = new MockUserPool() } = {}, ...requestConfigs) {
  pool.client = new MockClient(...requestConfigs); // eslint-disable-line no-param-reassign
  const CognitoUser = requireDefaultWithModuleMocks('./CognitoUser', {
    './AuthenticationHelper': MockAuthenticationHelper,
    './DateHelper': MockDateHelper,
  });
  return new CognitoUser({ Username, Pool: pool });
}

test.cb('authenticateUser() :: USER_SRP_AUTH, succeeds => creates session', t => {
  const expectedUsername = 'some-other-username';
  const expectedSrpBHex = 'cb'.repeat(16);
  const expectedSaltHex = 'a7'.repeat(16);
  const expectedSecretBlockHex = '0c'.repeat(16);

  const localStorage = {
    getItem: stub().returns(null),
    setItem: stub(),
  };
  global.window = { localStorage };

  const initiateAuthResponse = {
    ChallengeParameters: {
      USER_ID_FOR_SRP: expectedUsername,
      SRP_B: expectedSrpBHex,
      SALT: expectedSaltHex,
      SECRET_BLOCK: expectedSecretBlockHex,
    },
    Session: 'initiateAuth-session',
  };

  const respondToAuthChallengeResponse = {
    ChallengeName: 'USER_SRP_AUTH',
    AuthenticationResult: { IdToken, AccessToken, RefreshToken },
    Session: 'respondToAuthChallenge-session',
  };

  const user = createUser(
    {},
    requestSucceedsWith(initiateAuthResponse),
    requestSucceedsWith(respondToAuthChallengeResponse));

  user.authenticateUser(
    new AuthenticationDetails({ Username, Password, ValidationData }),
    createCallback(t, t.end, {
      onSuccess() {
        t.is(user.client.requestCallArgs.length, 2);
        requestCalledWithOnCall(t, user.client, 0, 'initiateAuth', {
          AuthFlow: 'USER_SRP_AUTH',
          ClientId,
          AuthParameters: {
            USERNAME: Username,
            SRP_A: SrpLargeAHex,
          },
          ClientMetadata: ValidationData,
        });
        requestCalledWithOnCall(t, user.client, 1, 'respondToAuthChallenge', {
          ChallengeName: 'PASSWORD_VERIFIER',
          ClientId,
          ChallengeResponses: {
            USERNAME: expectedUsername,
            PASSWORD_CLAIM_SECRET_BLOCK: initiateAuthResponse.ChallengeParameters.SECRET_BLOCK,
            TIMESTAMP: dateNow,
            PASSWORD_CLAIM_SIGNATURE: 'fSJS+J84N4iLwR5UPrqVeXSp9XwuG8NtVHHS9srOEcQ=',
          },
          Session: initiateAuthResponse.Session,
        });
        t.is(user.username, expectedUsername);
        t.is(user.Session, null);
        const userSession = user.getSignInUserSession();
        t.is(userSession.getIdToken().getJwtToken(), IdToken);
        t.is(userSession.getAccessToken().getJwtToken(), AccessToken);
        t.is(userSession.getRefreshToken().getToken(), RefreshToken);
      },
    }));
});

test.todo('authenticateUser() :: USER_SRP_AUTH, initiateAuth fails => raises onFailure');
test.todo('authenticateUser() :: USER_SRP_AUTH, respondToAuthChallenge fails => raises onFailure');
// ... other flows
test.todo('authenticateUser() :: MFA required => calls mfaRequired');
test.todo('authenticateUser() :: custom challenge => calls customChallenge');

test.todo('getDeviceResponse() :: DEVICE_SRP_AUTH fails => calls onFailure');
test.todo('getDeviceResponse() :: DEVICE_PASSWORD_VERIFIER fails => calls onFailure');
test.todo('getDeviceResponse() :: succeeds => signs in and calls onSuccess');

test.todo('sendCustomChallengeAnswer() :: fails => calls onFailure');
test.todo('sendCustomChallengeAnswer() :: succeeds => calls onSuccess');

