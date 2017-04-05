/* eslint-disable */

import test from 'ava';
import { stub } from 'sinon';
import mockRequire, { reRequire } from 'mock-require';

export class MockClient {
  constructor(...requestConfigs) {
    this.requestConfigs = requestConfigs;
    this.nextRequestIndex = 0;
    this.requestCallArgs = [];
  }

  get requestCallCount() {
    return this.requestCallArgs.length;
  }

  getRequestCallArgs(call) {
    return this.requestCallArgs[call];
  }

  makeUnauthenticatedRequest(name, args, cb) {
    if (typeof cb !== 'function') {
      throw new TypeError('MockClient requires cb arg.')
    }
    this.requestCallArgs.push({ name, args });
    if (this.nextRequestIndex >= this.requestConfigs.length) {
      throw new Error(`No config for request ${this.nextRequestIndex}: '${name}'(${JSON.stringify(args)}).`);
    }
    const requestConfig = this.requestConfigs[this.nextRequestIndex++];
    cb(...requestConfig);
  }
}

export function requestFailsWith(err) {
  return [err, null];
}

export function requestSucceedsWith(result) {
  return [null, result];
}

export function requestCalledWithOnCall(t, client, callIndex, expectedName, expectedArgs) {
  const { name, args } = client.getRequestCallArgs(callIndex);
  t.is(name, expectedName);
  t.deepEqual(args, expectedArgs);
}

export function requestCalledOnceWith(t, client, expectedName, expectedArgs) {
  t.true(client.requestCallCount === 1);
  requestCalledWithOnCall(t, client, 0, expectedName, expectedArgs);
}

export function createCallback(t, done, callbackTests) {
  const callback = {};
  Object.keys(callbackTests).forEach(key => {
    callback[key] = function testCallbackMethod(...args) {
      t.is(this, callback);
      callbackTests[key](...args);
      done();
    };
  });
  return callback;
}

export function createBasicCallback(t, succeeds, expectedError, done) {
  return createCallback(t, done, {
    onFailure(err) {
      t.false(succeeds);
      t.is(err, expectedError);
    },
    onSuccess() {
      t.true(succeeds);
    },
  });
}

test.afterEach.always(t => {
  mockRequire.stopAll();
  delete global.window;
});

const defaultMocks = {
  'aws-sdk/clients/cognitoidentityserviceprovider': MockClient,
  './AuthenticationDetails': null,
  './AuthenticationHelper': null,
  './CognitoAccessToken': null,
  './CognitoIdToken': null,
  './CognitoRefreshToken': null,
  './CognitoUser': null,
  './CognitoUserAttribute': null,
  './CognitoUserPool': null,
  './CognitoUserSession': null,
  './DateHelper': null,
};

function requireWithModuleMocks(request, moduleMocks = {}) {
  const allModuleMocks = Object.assign({}, defaultMocks, moduleMocks);
  Object.keys(allModuleMocks).forEach(mockRequest => {
    if (mockRequest !== request) {
      mockRequire(mockRequest, allModuleMocks[mockRequest]);
    }
  });

  return reRequire(request);
}

export function requireDefaultWithModuleMocks(request, moduleMocks) {
  return requireWithModuleMocks(request, moduleMocks).default;
}

function titleMapString(value) {
  return value && typeof value === 'object'
    ? Object.keys(value).map(key => `${key}: ${JSON.stringify(value[key])}`).join(', ')
    : value || '';
}

export function title(
  fn,
  { args, context, succeeds, outcome = succeeds ? 'succeeds' : 'fails' }
) {
  const fnString = typeof fn === 'function' ? fn.name.replace(/Macro$/, '') : fn;
  const callString = fn || args ? `${fnString}(${titleMapString(args)})` : '';
  const contextString = titleMapString(context);
  const prefixString = callString && contextString
    ? `${callString} :: ${contextString}`
    : callString || contextString;
  return `${prefixString} => ${outcome}`;
}

export function addSimpleTitle(macro, { args, context } = {}) {
  // eslint-disable-next-line no-param-reassign
  macro.title = (_, succeeds, ...values) => (
    title(macro, {
      succeeds,
      args: args && args(...values),
      context: context && context(...values),
    })
  );
}
