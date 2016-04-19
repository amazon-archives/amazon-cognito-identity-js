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

AWS.CognitoIdentityServiceProvider.CognitoUserPool = (function() {


    /**
     * Constructs a new CognitoUserPool object
     * @param data contains the client id and the user pool id
     * @constructor
     */

    var CognitoUserPool = function CognitoUserPool(data) {
        if (!(this instanceof CognitoUserPool)) {
            throw new Error('CognitoUserPool constructor was not called with new.');
        }

        if (data == null || data.UserPoolId == null || data.ClientId == null) {
            throw new Error('Both user pool Id and client Id are required.');
        }
          
        this.userPoolId = data.UserPoolId;
        this.clientId = data.ClientId;

        this.client = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-19'});
    };


    /**
     * Returns the user pool id
     * @returns {string}
     */

    CognitoUserPool.prototype.getUserPoolId = function getUserPoolId() {
        return this.userPoolId;
    };

    /**
     * Returns the client id
     * @returns {string}
     */

    CognitoUserPool.prototype.getClientId = function getClientId() {
        return this.clientId;
    };


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

    CognitoUserPool.prototype.signUp = function signUp(username, password, userAttributes, validationData, callback) {
        self = this;
        this.client.signUp ({
            ClientId : self.clientId,
            Username : username,
            Password : password,
            UserAttributes : userAttributes,
            ValidationData : validationData
        }, function (err, data) {
            if (err) {
                return callback(err, null);
            } else {
                var cognitoUser = {
                    Username : username,
                    Pool : self
                };

                var returnData = {
                    user : new AWS.CognitoIdentityServiceProvider.CognitoUser(cognitoUser),
                    userConfirmed : data.UserConfirmed
                };

                return callback(null, returnData);
            }
        });
    };

    
     /**
     * method for getting the current user of the application from the local storage
     * 
     * @returns {CognitoUser} the user retrieved from storage
     */

    CognitoUserPool.prototype.getCurrentUser = function getCurrentUser() {
        var lastUserKey = 'CognitoIdentityServiceProvider.' + this.clientId + '.LastAuthUser';
        var storage = window.localStorage;

        var lastAuthUser = storage.getItem(lastUserKey);
        if (lastAuthUser) {
            var cognitoUser = {
                Username : lastAuthUser,
                Pool : this
            };

            return new AWS.CognitoIdentityServiceProvider.CognitoUser(cognitoUser);
        } else {
            return null;
        }
    };

    return CognitoUserPool;

})();
