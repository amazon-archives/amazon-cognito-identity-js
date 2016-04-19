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

AWS.CognitoIdentityServiceProvider.CognitoUser = (function() {

    /**
     * Constructs a new CognitoUser object
     * @param data
     * @constructor
     */

    var CognitoUser = function CognitoUser(data) {
        if (!(this instanceof CognitoUser)) {
            throw new Error('CognitoUser constructor was not called with new.');
        }

       	if (data == null || data.Username == null || data.Pool== null) {
       	    throw new Error('Username and pool information are required.');
       	}

        this.username = data.Username || '';
        this.pool = data.Pool;
        this.AuthState = null;
 
	this.client = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-19'});
        this.signInUserSession = null;
    };

    /**
     * Gets the current session for this user 
     *
     * @returns {CognitoUserSession}
     */

    CognitoUser.prototype.getSignInUserSession = function getSignInUserSession() {
        return this.signInUserSession;
    };

    /**
     * Returns the user's username
     * @returns {string}
     */

    CognitoUser.prototype.getUsername = function getUsername() {
        return this.username;
    };

    /**
     * This is used for authenticating the user. it calls the AuthenticationHelper for SRP related stuff
     * @param authentication details, contains the authentication data
     * @param callback
     * @returns {CognitoUserSession}
     */

    CognitoUser.prototype.authenticateUser = function authenticateUser(authDetails, callback) {
        var authenticationHelper = new AWS.CognitoIdentityServiceProvider.AuthenticationHelper(this.pool.getUserPoolId().split('_')[1]);

        var serverBValue;
        var salt;
	var self = this;

        this.client.getAuthenticationDetails ({
            ClientId : this.pool.getClientId(),
            Username : this.username,
            SrpA : authenticationHelper.getLargeAValue().toString(16),
	    ValidationData : authDetails.getValidationData()
        }, function (err, data) {
            if (err) {
                return callback.onFailure(err);
            }
            self.username = data.Username;
	    serverBValue = new BigInteger(data.SrpB, 16);
            salt = new BigInteger(data.Salt, 16);
 
            var hkdf = authenticationHelper.getPasswordAuthenticationKey(self.username, authDetails.getPassword(), serverBValue, salt);
            var secretBlockBits = sjcl.codec.bytes.toBits(data.SecretBlock);

	    var mac = new sjcl.misc.hmac(hkdf, sjcl.hash.sha256);
            mac.update(sjcl.codec.utf8String.toBits(self.pool.getUserPoolId().split('_')[1]));
	    mac.update(sjcl.codec.utf8String.toBits(self.username));
	    mac.update(secretBlockBits);
            var now = moment().utc();
            var dateNow = now.format('ddd MMM D HH:mm:ss UTC YYYY');
	    mac.update(sjcl.codec.utf8String.toBits(dateNow));
            var signature = mac.digest();
	    var signatureBytes = sjcl.codec.bytes.fromBits(signature);

            var signatureBuffer = new ArrayBuffer(32);
            var bufView = new Uint8Array(signatureBuffer);

            for (var i = 0; i < signatureBytes.length; i ++) {
		bufView[i] = signatureBytes[i];
            }

            var passwordClaim = {
		 SecretBlock : data.SecretBlock,
		 Signature : bufView
            };

            self.client.authenticate ({
                ClientId : self.pool.getClientId(),
                Username : self.username,
                PasswordClaim : passwordClaim,
		Timestamp : now.toDate()
            }, function (errAuthenticate, dataAuthenticate) {
                if (errAuthenticate) {
                    return callback.onFailure(errAuthenticate);
                }

                var codeDeliveryDetails = dataAuthenticate.CodeDeliveryDetails;
                if (codeDeliveryDetails == null) {
                    self.signInUserSession = self.getCognitoUserSession(dataAuthenticate.AuthenticationResult);
                    self.cacheTokens();
                    return callback.onSuccess(self.signInUserSession);
                } else {
                    self.AuthState = dataAuthenticate.AuthState;
                    return callback.mfaRequired(codeDeliveryDetails);
                }
                
            });
        });
    };

    /**
     * This is used for a certain user to confirm the registration by using a confirmation code
     * @param confirmationCode
     * @param forceAliasCreation
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.confirmRegistration = function confirmRegistration(confirmationCode, forceAliasCreation, callback) {
	this.client.confirmSignUp({
	    ClientId : this.pool.getClientId(),
	    ConfirmationCode : confirmationCode,
	    Username : this.username,
            ForceAliasCreation : forceAliasCreation
        }, function (err, data) {
	    if (err) {
                return callback(err, null);
            } else {
		return callback(null, 'SUCCESS');
	    }
        });
    };

    /**
     * This is used by the user once he has an MFA code
     * @param confirmationCode
     * @param callback
     * @returns {CognitoUserSession}
     */

    CognitoUser.prototype.sendMFACode = function sendMFACode(confirmationCode, callback) {
        self = this;
        this.client.enhanceAuth ({
            Username : this.username,
            Code : confirmationCode,
            AuthState : this.AuthState,
            ClientId : this.pool.getClientId()
        }, function (err, data) {
            if (err) {
                return callback.onFailure(err);
            } else {
                self.signInUserSession = self.getCognitoUserSession(data.AuthenticationResult);
                self.cacheTokens();
                return callback.onSuccess(self.signInUserSession);
            }
	});
    };

    /**
     * This is used by an authenticated user to change the current password
     * @param oldUserPassword
     * @param newUserPassword
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.changePassword = function changePassword(oldUserPassword, newUserPassword, callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.changePassword({
                PreviousPassword : oldUserPassword,
                ProposedPassword : newUserPassword,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            }); 
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used by an authenticated user to enable MFA for himself
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.enableMFA = function enableMFA(callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            var mfaOptions = []
            var mfaEnabled = {
                DeliveryMedium : 'SMS',
                AttributeName : 'phone_number'
            };
            mfaOptions.push(mfaEnabled);

            this.client.setUserSettings({
                MFAOptions : mfaOptions,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        } 
    };

    /**
     * This is used by an authenticated user to disable MFA for himself
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.disableMFA = function disableMFA(callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            var mfaOptions = []

            this.client.setUserSettings({
               	MFAOptions : mfaOptions,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };


    /**
     * This is used by an authenticated user to delete himself
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.deleteUser = function deleteUser(callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.deleteUser({
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used by an authenticated user to change a list of attributes
     * @param attributes
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.updateAttributes = function updateAttributes(attributes, callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.updateUserAttributes({
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken(),
                UserAttributes : attributes
            }, function (err, dataUpdateAttributes) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used by an authenticated user to get a list of attributes
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.getUserAttributes = function getUserAttributes(callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.getUser({
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, userData) {
                if (err) {
                    return callback(err, null);
                } else {
                    var attributeList = [];

                    for (i = 0; i < userData.UserAttributes.length; i++) {
                        var attribute = {
                            Name : userData.UserAttributes[i].Name,
                            Value : userData.UserAttributes[i].Value
                        };
                        var userAttribute = new AWS.CognitoIdentityServiceProvider.CognitoUserAttribute(attribute);
                        attributeList.push(userAttribute);
                    }

                    return callback(null, attributeList);
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used by an authenticated user to delete a list of attributes
     * @param attributeList
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.deleteAttributes = function deleteAttributes(attributeList, callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.deleteUserAttributes({
                UserAttributeNames : attributeList,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, userData) {
                if (err) {
                    return callback(err, null);
                } else {
                    return callback(null, 'SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used by a user to resend a confirmation code
     * @param callback
     * @returns error or success
     */

    CognitoUser.prototype.resendConfirmationCode = function resendConfirmationCode(callback) {
        this.client.resendConfirmationCode({
            ClientId : this.pool.getClientId(),
            Username : this.username
        }, function (err, data) {
	    if (err) {
                return callback(err, null);
	    } else {
                return callback(null, 'SUCCESS');
            }
        });
    };

    /**
     * This is used to get a session, either from the session object
     * or from  the local storage, or by using a refresh token 
     *
     * @param callback
     * @returns error or session
     */

    CognitoUser.prototype.getSession = function getSession(callback) {
        if (this.username == null) {
            return callback(new Error('Username is null. Cannot retrieve a new session'), null);
        }
 
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            return callback(null, this.signInUserSession);
        }

        var idTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.idToken';
        var accessTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.accessToken';
        var refreshTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.refreshToken';
         
        var storage = window.localStorage;

        if (storage.getItem(idTokenKey)) {
            var idToken = new AWS.CognitoIdentityServiceProvider.CognitoIdToken({IdToken:storage.getItem(idTokenKey)});
            var accessToken = new AWS.CognitoIdentityServiceProvider.CognitoAccessToken({AccessToken:storage.getItem(accessTokenKey)});
            var refreshToken = new AWS.CognitoIdentityServiceProvider.CognitoRefreshToken({RefreshToken:storage.getItem(refreshTokenKey)});

            var sessionData = {
               IdToken : idToken,
               AccessToken : accessToken,
               RefreshToken : refreshToken
            };
            var cachedSession = new AWS.CognitoIdentityServiceProvider.CognitoUserSession(sessionData);
            if (cachedSession.isValid()) {
                this.signInUserSession = cachedSession;
                return callback(null, this.signInUserSession);
            } else {
                if (refreshToken.getToken() != null) {
                    this.refreshSession(refreshToken, callback);
                } else {
                    return callback(new Error('Cannot retrieve a new session. Please authenticate.'), null);
                }
            }
        }
    };


    /**
     * This uses the refreshToken to retrieve a new session
     * @param refreshToken
     * @param callback
     * @returns error or new session
     */

    CognitoUser.prototype.refreshSession = function refreshSession(refreshToken, callback) {
        self = this;
        this.client.refreshTokens({
            ClientId : this.pool.getClientId(),
            RefreshToken : refreshToken.getToken()
        }, function (err, authResult) {
            if (err) {
                return callback(err, null);
            }
            if (authResult) {
                self.signInUserSession = self.getCognitoUserSession(authResult.AuthenticationResult);
                return callback(null, self.signInUserSession);
            }
        });
    };

    /**
     * This is used to save the session tokens to local storage
     */

    CognitoUser.prototype.cacheTokens = function cacheTokens() {
        var idTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.idToken';
        var accessTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.accessToken';
        var refreshTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.refreshToken';
        var lastUserKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.LastAuthUser';

        var storage = window.localStorage;

        storage.setItem(idTokenKey, this.signInUserSession.getIdToken().getJwtToken());
        storage.setItem(accessTokenKey, this.signInUserSession.getAccessToken().getJwtToken());
        storage.setItem(refreshTokenKey, this.signInUserSession.getRefreshToken().getToken());
        storage.setItem(lastUserKey, this.username);
    };

    /**
     * This is used to clear the session tokens from local storage
     */

    CognitoUser.prototype.clearCachedTokens = function clearCachedTokens() {
        var idTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.idToken';
        var accessTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.accessToken';
        var refreshTokenKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.' + this.username + '.refreshToken';
        var lastUserKey = 'CognitoIdentityServiceProvider.' + this.pool.getClientId() + '.LastAuthUser';

        var storage = window.localStorage;

        storage.removeItem(idTokenKey);
        storage.removeItem(accessTokenKey);
        storage.removeItem(refreshTokenKey);
        storage.removeItem(lastUserKey);
    };


    /**
     * This is used to build a user session from tokens retrieved in the authentication result
     * @param authResult
     *
     */

    CognitoUser.prototype.getCognitoUserSession = function getCognitoUserSession(authResult) {
        var idToken = new AWS.CognitoIdentityServiceProvider.CognitoIdToken(authResult);
        var accessToken = new AWS.CognitoIdentityServiceProvider.CognitoAccessToken(authResult);
        var refreshToken = new AWS.CognitoIdentityServiceProvider.CognitoRefreshToken(authResult);

        var sessionData = {
            IdToken : idToken,
            AccessToken : accessToken,
            RefreshToken : refreshToken        
        };

        return new AWS.CognitoIdentityServiceProvider.CognitoUserSession(sessionData);
    };

    /**
     * This is used to initiate a forgot password request
     * @param callback
     * @returns error or success
     *
     */

    CognitoUser.prototype.forgotPassword = function forgotPassword(callback) {
        this.client.forgotPassword ({
            ClientId : this.pool.getClientId(),
            Username : this.username
        }, function (err, data) {
            if (err) {
                return callback.onFailure(err);
            } else {
                return callback.inputVerificationCode(data);
            }
        });
    };

    /**
     * This is used to confirm a new password using a confirmationCode
     * @param confirmationCode
     * @param newPassword
     * @param callback
     * @returns	error or success
     *
     */

    CognitoUser.prototype.confirmPassword = function confirmPassword(confirmationCode, newPassword, callback) {
        this.client.confirmForgotPassword ({
            ClientId : this.pool.getClientId(),
            Username : this.username,
            ConfirmationCode : confirmationCode,
            Password : newPassword
        }, function (err, data) {
            if (err) {
                return callback.onFailure(err);
            } else {
                return callback.onSuccess();
            }
        });
    };

    /**
     * This is used to initiate an attribute confirmation request
     * @param attributeName
     * @param callback
     * @returns error or success
     *
     */

    CognitoUser.prototype.getAttributeVerificationCode = function getAttributeVerificationCode(attributeName, callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.getUserAttributeVerificationCode ({
                AttributeName : attributeName,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback.onFailure(err);
                } else {
                    return callback.inputVerificationCode(data);
                }
	    }); 
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is used to confirm an attribute using a confirmation code
     * @param confirmationCode
     * @param attributeName
     * @param callback
     * @returns error or success
     *
     */

    CognitoUser.prototype.verifyAttribute = function verifyAttribute(attributeName, confirmationCode, callback) {
        if (this.signInUserSession != null && this.signInUserSession.isValid()) {
            this.client.verifyUserAttribute ({
                AttributeName : attributeName,
                Code : confirmationCode,
                AccessToken : this.signInUserSession.getAccessToken().getJwtToken()
            }, function (err, data) {
                if (err) {
                    return callback.onFailure(err);
                } else {
               	    return callback.onSuccess('SUCCESS');
                }
            });
        } else {
            return callback(new Error('User is not authenticated'), null);
        }
    };

    /**
     * This is ued for the user to signOut of the application and clear the cached tokens.
     *
     */

    CognitoUser.prototype.signOut = function signOut() {
        this.signInUserSession = null;
        this.clearCachedTokens();
    };

    return CognitoUser;

})();
