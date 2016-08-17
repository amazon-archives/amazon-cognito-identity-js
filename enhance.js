import { CognitoIdentityServiceProvider } from 'aws-sdk';
import * as enhancements from './src';

export * from './src';

Object.keys(enhancements).forEach(key => {
  CognitoIdentityServiceProvider[key] = enhancements[key];
});
