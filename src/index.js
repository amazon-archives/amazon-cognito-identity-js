/*!
 * Copyright 2016 Amazon.com,
 * Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the
 * License. A copy of the License is located at
 *
 *     http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, express or implied. See the License
 * for the specific language governing permissions and
 * limitations under the License.
 */

export { default as AuthenticationDetails } from './AuthenticationDetails';
export { default as AuthenticationHelper } from './AuthenticationHelper';
export { default as CognitoAccessToken } from './CognitoAccessToken';
export { default as CognitoIdToken } from './CognitoIdToken';
export { default as CognitoRefreshToken } from './CognitoRefreshToken';
export { default as CognitoUser } from './CognitoUser';
export { default as CognitoUserAttribute } from './CognitoUserAttribute';
export { default as CognitoUserPool } from './CognitoUserPool';
export { default as CognitoUserSession } from './CognitoUserSession';
export { default as CookieStorage } from './CookieStorage';
export { default as DateHelper } from './DateHelper';

// The version of crypto-browserify included by aws-sdk only
// checks for window.crypto, not window.msCrypto as used by
// IE 11 – so we set it explicitly here
if (typeof window !== 'undefined' && !window.crypto && window.msCrypto) {
  window.crypto = window.msCrypto;
}
