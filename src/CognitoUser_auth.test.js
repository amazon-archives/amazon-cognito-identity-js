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

test.todo('authenticateUser() :: USER_SRP_AUTH, succeeds => creates session');
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

