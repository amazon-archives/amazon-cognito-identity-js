/* eslint-disable */

import test from 'ava';
import { stub } from 'sinon';
import mockRequire from 'mock-require';

export class MockClient {}

export function stubClient(client, ...requestConfigs) {
  if (!(client instanceof MockClient)) {
    throw new Error(`'client' is not a MockClient: ${client}`)
  }
  const requestStub = stub();
  requestConfigs.forEach((requestConfig, i) => {
    const expectation = requestStub.onCall(i);
    expectation.yieldsAsync(...requestConfig);
  });
  client.makeUnauthenticatedRequest = requestStub; // eslint-disable-line no-param-reassign
}

export function requestFailsWith(err) {
  return [err, null];
}

export function requestSucceedsWith(result) {
  return [null, result];
}

test.afterEach.always(() => {
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
