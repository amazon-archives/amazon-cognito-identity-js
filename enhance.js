import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import * as enhancements from './src';

export * from './src';

Object.keys(enhancements).forEach(key => {
  CognitoIdentityServiceProvider[key] = enhancements[key];
});
