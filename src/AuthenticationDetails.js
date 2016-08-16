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

AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails = (function () {
    /**
     * Constructs a new AuthenticationDetails object
     * @param data - contains username, password, and a map of validation data
     * @constructor
     */

  const AuthenticationDetails = function AuthenticationDetails(data) {
    if (!(this instanceof AuthenticationDetails)) {
      throw new Error('AuthenticationDetails constructor was not called with new.');
    }

    data = data || {};

        // Assign object data
    this.validationData = data.ValidationData || [];
    this.username = data.Username;
    this.password = data.Password;
  };

    /**
     * Returns the record's username
     * @returns {string}
     */

  AuthenticationDetails.prototype.getUsername = function getUsername() {
    return this.username;
  };

    /**
     * Returns the record's password
     * @returns {string}
     */

  AuthenticationDetails.prototype.getPassword = function getPassword() {
    return this.password;
  };

    /**
     * Returns the record's validationData
     * @returns {Array}
     */

  AuthenticationDetails.prototype.getValidationData = function getValidationData() {
    return this.validationData;
  };

  return AuthenticationDetails;
})();
