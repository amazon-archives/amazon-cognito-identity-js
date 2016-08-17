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

import CognitoUser from './CognitoUser';

/** @class */
export default class CognitoUserPool {
  /**
   * Constructs a new CognitoUserPool object
   * @param {object} data Creation options.
   * @param {string} data.UserPoolId Cognito user pool id.
   * @param {string} data.ClientId User pool application client id.
   * @param {int=} data.Paranoia Random number generation paranoia level.
   */
  constructor(data) {
    if (data == null || data.UserPoolId == null || data.ClientId == null) {
      throw new Error('Both user pool Id and client Id are required.');
    }

    this.userPoolId = data.UserPoolId;
    this.clientId = data.ClientId;
    this.paranoia = data.Paranoia || 0;

    this.client = new AWSCognito.CognitoIdentityServiceProvider({ apiVersion: '2016-04-19' });
  }

  /**
   * @returns {string} the user pool id
   */
  getUserPoolId() {
    return this.userPoolId;
  }

  /**
   * @returns {string} the client id
   */
  getClientId() {
    return this.clientId;
  }

  /**
   * @returns {int} the paranoia level
   */
  getParanoia() {
    return this.paranoia;
  }

  /**
   * sets paranoia level
   * @param {int} paranoia The new paranoia level.
   * @returns {void}
   */
  setParanoia(paranoia) {
    this.paranoia = paranoia;
  }

  /**
   * @typedef {object} SignUpResult
   * @property {CognitoUser} user New user.
   * @property {bool} userConfirmed If the user is already confirmed.
   */
  /**
   * method for signing up a user
   * @param {string} username User's username.
   * @param {string} password Plain-text initial password entered by user.
   * @param {(AttributeArg[])=} userAttributes New user attributes.
   * @param {(AttributeArg[])=} validationData Application metadata.
   * @param {nodeCallback<SignUpResult>} callback Called on error or with the new user.
   * @returns {void}
   */
  signUp(username, password, userAttributes, validationData, callback) {
    this.client.makeUnauthenticatedRequest('signUp', {
      ClientId: this.clientId,
      Username: username,
      Password: password,
      UserAttributes: userAttributes,
      ValidationData: validationData,
    }, (err, data) => {
      if (err) {
        return callback(err, null);
      }

      const cognitoUser = {
        Username: username,
        Pool: this,
      };

      const returnData = {
        user: new CognitoUser(cognitoUser),
        userConfirmed: data.UserConfirmed,
      };

      return callback(null, returnData);
    });
  }


  /**
   * method for getting the current user of the application from the local storage
   *
   * @returns {CognitoUser} the user retrieved from storage
   */
  getCurrentUser() {
    const lastUserKey = `CognitoIdentityServiceProvider.${this.clientId}.LastAuthUser`;
    const storage = window.localStorage;

    const lastAuthUser = storage.getItem(lastUserKey);
    if (lastAuthUser) {
      const cognitoUser = {
        Username: lastAuthUser,
        Pool: this,
      };

      return new CognitoUser(cognitoUser);
    }

    return null;
  }
}
