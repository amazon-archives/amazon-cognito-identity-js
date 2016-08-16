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

AWSCognito.CognitoIdentityServiceProvider.CognitoRefreshToken = (function () {
    /**
     * Constructs a new CognitoRefreshToken object
     * @param data - contains tokens
     * @constructor
     */

  const CognitoRefreshToken = function CognitoRefreshToken(data) {
    if (!(this instanceof CognitoRefreshToken)) {
      throw new Error('CognitoRefreshToken constructor was not called with new.');
    }

    data = data || {};

        // Assign object
    this.token = data.RefreshToken || '';
  };

    /**
     * Returns the record's token.
     * @returns {string}
     */

  CognitoRefreshToken.prototype.getToken = function getToken() {
    return this.token;
  };

  return CognitoRefreshToken;
})();
