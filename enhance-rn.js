import AWS from 'aws-sdk/global';
import { NativeModules } from 'react-native';
import * as enhancements from './src';

import BigInteger from './src/BigInteger';

export * from './src';


const { RNAWSCognito } = NativeModules;

Object.keys(enhancements).forEach(key => {
  AWS.CognitoIdentityServiceProvider[key] = enhancements[key];
});

BigInteger.prototype.modPow = function nativeModPow(e, m, callback) {
  RNAWSCognito.computeModPow({
    target: this.toString(16),
    value: e.toString(16),
    modifier: m.toString(16),
  }, (err, result) => {
    if (err) {
      return callback(new Error(err), null);
    }
    const bigIntResult = new BigInteger(result, 16);
    return callback(null, bigIntResult);
  });
};

enhancements.AuthenticationHelper.prototype.calculateS =
function nativeComputeS(xValue, serverBValue, callback) {
  RNAWSCognito.computeS({
    g: this.g.toString(16),
    x: xValue.toString(16),
    k: this.k.toString(16),
    a: this.smallAValue.toString(16),
    b: serverBValue.toString(16),
    u: this.UValue.toString(16),
  }, (err, result) => {
    if (err) {
      return callback(new Error(err), null);
    }
    const bigIntResult = new BigInteger(result, 16);
    return callback(null, bigIntResult);
  });
  return undefined;
};

const libraryVersion = '1.0';
const libraryName = 'aws-amplify';
const originalUserAgent = AWS.util.userAgent;
if (originalUserAgent) {
  AWS.util.userAgent = function newUserAgent() {
    return `${libraryName}/${libraryVersion} ${originalUserAgent()}`;
  };
} else {
  const previousUserAgent = AWS.config.customUserAgent || '';
  AWS.config.update({ customUserAgent: `${libraryName}/${libraryVersion} ${previousUserAgent}` });
}
