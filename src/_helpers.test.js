/* eslint-disable */

import test from 'ava';
import { stub } from 'sinon';
import mockRequire from 'mock-require';

export class MockClient {
  constructor(...requestConfigs) {
    this.requestConfigs = requestConfigs;
    this.nextRequestIndex = 0;
    this.requestCallArgs = [];
  }

  makeUnauthenticatedRequest(name, args, cb) {
    this.requestCallArgs.push([name, args, cb]);
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

export function requestCalledWithOnCall(t, client, call, expectedName, expectedArgs) {
  const [name, args, cb] = client.requestCallArgs[call];
  t.is(name, expectedName);
  t.deepEqual(args, expectedArgs);
  t.true(typeof cb === 'function');
}

export function requestCalledOnceWith(t, client, ...expectedArgs) {
  t.true(client.requestCallArgs.length === 1);
  requestCalledWithOnCall(t, client, 0, ...expectedArgs);
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

function shouldMock(path) {
  return path.startsWith(__dirname) && !path.endsWith('.test.js');
}

function requireWithModuleMocks(request, moduleMocks = {}) {
  const unmockedCache = Object.create(null);

  // Remove require.cache entries that may be using the unmocked modules
  Object.keys(require.cache).forEach(path => {
    if (shouldMock(path)) {
      delete require.cache[path];
    }
  });

  // Always mock AWS SDK
  mockRequire('aws-sdk/clients/cognitoidentityserviceprovider', MockClient);

  // Mock other modules
  Object.keys(moduleMocks).forEach(name => {
    mockRequire(name, moduleMocks[name]);
  });

  const mockedModule = require(request);

  // Restore require.cache to previous state
  Object.keys(require.cache).forEach(path => {
    if (shouldMock(path)) {
      if (Object.prototype.hasOwnProperty.call(unmockedCache, path)) {
        require.cache[path] = unmockedCache[path];
      } else {
        delete require.cache[path];
      }
    }
  });

  return mockedModule;
}

export function requireDefaultWithModuleMocks(request, moduleMocks) {
  return requireWithModuleMocks(request, moduleMocks).default;
}
