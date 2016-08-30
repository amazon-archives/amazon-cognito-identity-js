/* eslint-disable */

import test from 'ava';
import { stub } from 'sinon';
import mockRequire from 'mock-require';

export class MockClient {}

export function mockAwsSdk() {
  mockRequire('aws-sdk', {
    CognitoIdentityServiceProvider: MockClient,
  });
}

export function stubClient(client, ...requestConfigs) {
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

function requireWithModuleMocks(request, moduleMocks = {}) {
  function shouldReRequire(path) {
    return path.indexOf(__dirname) !== 0;
  }

  Object.keys(require.cache).forEach(path => {
    if (path.indexOf(__dirname) === 0) {
      delete require.cache[path];
    }
  });

  mockAwsSdk();

  Object.keys(moduleMocks).forEach(name => {
    mockRequire(name, moduleMocks[name]);
  });

  return require(request);
}

export function requireDefaultWithModuleMocks(request, moduleMocks) {
  return requireWithModuleMocks(request, moduleMocks).default;
}
