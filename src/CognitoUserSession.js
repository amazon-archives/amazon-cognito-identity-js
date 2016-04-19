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

AWS.CognitoIdentityServiceProvider.CognitoUserSession = (function() {

    /**
     * Constructs a new CognitoUserSession object
     * @param data - contains IdToken, RefreshToken, and an AccessToken
     * @constructor
     */

    var CognitoUserSession = function CognitoUserSession(data) {
        if (!(this instanceof CognitoUserSession)) {
            throw new Error('CognitoUserSession constructor was not called with new.');
        }

        data = data || {};
        if (data.AccessToken == null || data.IdToken == null) {
            throw new Error('Id token and Access Token must be present.');
        }

        this.idToken = data.IdToken;
        this.refreshToken = data.RefreshToken;
        this.accessToken = data.AccessToken;
    };

    /**
     * Returns the session's Id token
     * @returns {CognitoIdToken}
     */

    CognitoUserSession.prototype.getIdToken = function getIdToken() {
        return this.idToken;
    };

    /**
     * Returns the session's refresh token
     * @returns {CognitoRefreshToken}
     */

    CognitoUserSession.prototype.getRefreshToken = function getRefreshToken() {
        return this.refreshToken;
    };

    /**
     * Returns the session's access token
     * @returns {CognitoAccessToken}
     */

    CognitoUserSession.prototype.getAccessToken = function getAccessToken() {
        return this.accessToken;
    };

    /**
     * Checks to see if the session is still valid
     * @returns {boolean} if the session is still valid based on session expiry information found in tokens and the current time
     */

    CognitoUserSession.prototype.isValid = function isValid() {
        var now = moment().utc();
        
        return now.isBefore(this.accessToken.getExpiration()) && now.isBefore(this.idToken.getExpiration());
    };

    return CognitoUserSession;

})();
