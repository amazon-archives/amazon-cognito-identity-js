/**
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

import * as AWSCognito from '../dist/aws-cognito-sdk';
import CognitoUser from './CognitoUser';

export default class CognitoUserPool {
  /**
   * Constructs a new CognitoUserPool object
   * @param data contains the client id and the user pool id
   * @constructor
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
   * Returns the user pool id
   * @returns {string}
   */

  getUserPoolId() {
    return this.userPoolId;
  }

  /**
   * Returns the client id
   * @returns {string}
   */

  getClientId() {
    return this.clientId;
  }

  /**
   * Returns the paranoia level
   * @returns {int}
   */

  getParanoia() {
    return this.paranoia;
  }

  /**
   * sets paranoia level
   * @param paranoia
   */

  setParanoia(paranoia) {
    this.paranoia = paranoia;
  }

  /**
   * method for signing up a user
   * @param username
   * @param password
   * @param userAttributes
   * @param validationData
   * @param callback
   *
   * @returns object containing cognito user and if the user is confirmed or not
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
