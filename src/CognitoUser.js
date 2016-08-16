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

import * as sjcl from 'sjcl';
import { BigInteger } from 'bn';

import AuthenticationHelper from './AuthenticationHelper';
import CognitoAccessToken from './CognitoAccessToken';
import CognitoIdToken from './CognitoIdToken';
import CognitoRefreshToken from './CognitoRefreshToken';
import CognitoUserSession from './CognitoUserSession';
import DateHelper from './DateHelper';
import CognitoUserAttribute from './CognitoUserAttribute';

export default class CognitoUser {
  /**
   * Constructs a new CognitoUser object
   * @param data
   * @constructor
   */

  constructor(data) {
    if (data == null || data.Username == null || data.Pool == null) {
      throw new Error('Username and pool information are required.');
    }

    this.username = data.Username || '';
    this.pool = data.Pool;
    this.Session = null;

    this.client = new AWSCognito.CognitoIdentityServiceProvider({ apiVersion: '2016-04-19' });

    this.signInUserSession = null;
    this.authenticationFlowType = 'USER_SRP_AUTH';
  }

  /**
   * Gets the current session for this user
   *
   * @returns {CognitoUserSession}
   */

  getSignInUserSession() {
    return this.signInUserSession;
  }

  /**
   * Returns the user's username
   * @returns {string}
   */

  getUsername() {
    return this.username;
  }

  /**
   * Returns the authentication flow type
   * @returns {String}
   */

  getAuthenticationFlowType() {
    return this.authenticationFlowType;
  }

  /**
   * sets authentication flow type
   * @param authenticationFlowType
   */

  setAuthenticationFlowType(authenticationFlowType) {
    this.authenticationFlowType = authenticationFlowType;
  }

  /**
   * This is used for authenticating the user. it calls the AuthenticationHelper for SRP related
   * stuff
   * @param authDetails authentication details, contains the authentication data
   * @param callback
   * @returns {CognitoUserSession}
   */

  authenticateUser(authDetails, callback) {
    const authenticationHelper = new AuthenticationHelper(
      this.pool.getUserPoolId().split('_')[1],
      this.pool.getParanoia());
    const dateHelper = new DateHelper();

    let serverBValue;
    let salt;
    const authParameters = {};

    if (this.deviceKey != null) {
      authParameters.DEVICE_KEY = this.deviceKey;
    }

    authParameters.USERNAME = this.username;
    authParameters.SRP_A = authenticationHelper.getLargeAValue().toString(16);

    if (this.authenticationFlowType === 'CUSTOM_AUTH') {
      authParameters.CHALLENGE_NAME = 'SRP_A';
    }

    this.client.makeUnauthenticatedRequest('initiateAuth', {
      AuthFlow: this.authenticationFlowType,
      ClientId: this.pool.getClientId(),
      AuthParameters: authParameters,
      ClientMetadata: authDetails.getValidationData(),
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }

      const challengeParameters = data.ChallengeParameters;

      this.username = challengeParameters.USER_ID_FOR_SRP;
      serverBValue = new BigInteger(challengeParameters.SRP_B, 16);
      salt = new BigInteger(challengeParameters.SALT, 16);
      this.getCachedDeviceKeyAndPassword();

      const hkdf = authenticationHelper.getPasswordAuthenticationKey(
        this.username,
        authDetails.getPassword(),
        serverBValue,
        salt);
      const secretBlockBits = sjcl.codec.base64.toBits(challengeParameters.SECRET_BLOCK);

      const mac = new sjcl.misc.hmac(hkdf, sjcl.hash.sha256);
      mac.update(sjcl.codec.utf8String.toBits(this.pool.getUserPoolId().split('_')[1]));
      mac.update(sjcl.codec.utf8String.toBits(this.username));
      mac.update(secretBlockBits);
      const dateNow = dateHelper.getNowString();
      mac.update(sjcl.codec.utf8String.toBits(dateNow));
      const signature = mac.digest();
      const signatureString = sjcl.codec.base64.fromBits(signature);

      const challengeResponses = {};

      challengeResponses.USERNAME = this.username;
      challengeResponses.PASSWORD_CLAIM_SECRET_BLOCK = challengeParameters.SECRET_BLOCK;
      challengeResponses.TIMESTAMP = dateNow;
      challengeResponses.PASSWORD_CLAIM_SIGNATURE = signatureString;

      if (this.deviceKey != null) {
        challengeResponses.DEVICE_KEY = this.deviceKey;
      }

      this.client.makeUnauthenticatedRequest('respondToAuthChallenge', {
        ChallengeName: 'PASSWORD_VERIFIER',
        ClientId: this.pool.getClientId(),
        ChallengeResponses: challengeResponses,
        Session: data.Session,
      }, (errAuthenticate, dataAuthenticate) => {
        if (errAuthenticate) {
          return callback.onFailure(errAuthenticate);
        }

        const challengeName = dataAuthenticate.ChallengeName;
        if (challengeName === 'SMS_MFA') {
          this.Session = dataAuthenticate.Session;
          return callback.mfaRequired(challengeName);
        }

        if (challengeName === 'CUSTOM_CHALLENGE') {
          this.Session = dataAuthenticate.Session;
          return callback.customChallenge(dataAuthenticate.ChallengeParameters);
        }

        if (challengeName === 'DEVICE_SRP_AUTH') {
          this.getDeviceResponse(callback);
          return undefined;
        }

        this.signInUserSession = this.getCognitoUserSession(
          dataAuthenticate.AuthenticationResult);
        this.cacheTokens();

        const newDeviceMetadata = dataAuthenticate.AuthenticationResult.NewDeviceMetadata;
        if (newDeviceMetadata == null) {
          return callback.onSuccess(this.signInUserSession);
        }

        // const deviceStuff = authenticationHelper.generateHashDevice(
        //   dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceGroupKey,
        //   dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceKey);

        const deviceSecretVerifierConfig = {
          Salt: sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(
            authenticationHelper.getSaltDevices().toString(16))),
          PasswordVerifier: sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(
            authenticationHelper.getVerifierDevices().toString(16))),
        };

        this.verifierDevices = sjcl.codec.base64.fromBits(
          authenticationHelper.getVerifierDevices());
        this.deviceGroupKey = newDeviceMetadata.DeviceGroupKey;
        this.randomPassword = authenticationHelper.getRandomPassword();

        this.client.makeUnauthenticatedRequest('confirmDevice', {
          DeviceKey: newDeviceMetadata.DeviceKey,
          AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
          DeviceSecretVerifierConfig: deviceSecretVerifierConfig,
          DeviceName: navigator.userAgent,
        }, (errConfirm, dataConfirm) => {
          if (errConfirm) {
            return callback.onFailure(errConfirm);
          }
          this.deviceKey = dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceKey;
          this.cacheDeviceKeyAndPassword();
          if (dataConfirm.UserConfirmationNecessary === true) {
            return callback.onSuccess(
              this.signInUserSession,
              dataConfirm.UserConfirmationNecessary);
          }
          return callback.onSuccess(this.signInUserSession);
        });
        return undefined;
      });
      return undefined;
    });
  }

  /**
   * This is used to get a session using device authentication. It is called at the end of user
   * authentication
   *
   * @param callback
   * @response error or session
   */

  getDeviceResponse(callback) {
    const authenticationHelper = new AuthenticationHelper(
      this.deviceGroupKey,
      this.pool.getParanoia());
    const dateHelper = new DateHelper();

    const authParameters = {};

    authParameters.USERNAME = this.username;
    authParameters.DEVICE_KEY = this.deviceKey;
    authParameters.SRP_A = authenticationHelper.getLargeAValue().toString(16);

    this.client.makeUnauthenticatedRequest('respondToAuthChallenge', {
      ChallengeName: 'DEVICE_SRP_AUTH',
      ClientId: this.pool.getClientId(),
      ChallengeResponses: authParameters,
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }

      const challengeParameters = data.ChallengeParameters;

      const serverBValue = new BigInteger(challengeParameters.SRP_B, 16);
      const salt = new BigInteger(challengeParameters.SALT, 16);

      const hkdf = authenticationHelper.getPasswordAuthenticationKey(
        this.deviceKey,
        this.randomPassword,
        serverBValue,
        salt);
      const secretBlockBits = sjcl.codec.base64.toBits(challengeParameters.SECRET_BLOCK);

      const mac = new sjcl.misc.hmac(hkdf, sjcl.hash.sha256);
      mac.update(sjcl.codec.utf8String.toBits(this.deviceGroupKey));
      mac.update(sjcl.codec.utf8String.toBits(this.deviceKey));
      mac.update(secretBlockBits);
      const dateNow = dateHelper.getNowString();
      mac.update(sjcl.codec.utf8String.toBits(dateNow));
      const signature = mac.digest();
      const signatureString = sjcl.codec.base64.fromBits(signature);

      const challengeResponses = {};

      challengeResponses.USERNAME = this.username;
      challengeResponses.PASSWORD_CLAIM_SECRET_BLOCK = challengeParameters.SECRET_BLOCK;
      challengeResponses.TIMESTAMP = dateNow;
      challengeResponses.PASSWORD_CLAIM_SIGNATURE = signatureString;
      challengeResponses.DEVICE_KEY = this.deviceKey;

      this.client.makeUnauthenticatedRequest('respondToAuthChallenge', {
        ChallengeName: 'DEVICE_PASSWORD_VERIFIER',
        ClientId: this.pool.getClientId(),
        ChallengeResponses: challengeResponses,
        Session: data.Session,
      }, (errAuthenticate, dataAuthenticate) => {
        if (errAuthenticate) {
          return callback.onFailure(errAuthenticate);
        }

        this.signInUserSession = this.getCognitoUserSession(dataAuthenticate.AuthenticationResult);
        this.cacheTokens();

        return callback.onSuccess(this.signInUserSession);
      });
      return undefined;
    });
  }

  /**
   * This is used for a certain user to confirm the registration by using a confirmation code
   * @param confirmationCode
   * @param forceAliasCreation
   * @param callback
   * @returns error or success
   */

  confirmRegistration(confirmationCode, forceAliasCreation, callback) {
    this.client.makeUnauthenticatedRequest('confirmSignUp', {
      ClientId: this.pool.getClientId(),
      ConfirmationCode: confirmationCode,
      Username: this.username,
      ForceAliasCreation: forceAliasCreation,
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
  }

  /**
   * This is used by the user once he has the responses to a custom challenge
   * @param answerChallenge
   * @param callback
   * @returns {CognitoUserSession}
   */

  sendCustomChallengeAnswer(answerChallenge, callback) {
    const challengeResponses = {};
    challengeResponses.USERNAME = this.username;
    challengeResponses.ANSWER = answerChallenge;

    this.client.makeUnauthenticatedRequest('respondToAuthChallenge', {
      ChallengeName: 'CUSTOM_CHALLENGE',
      ChallengeResponses: challengeResponses,
      ClientId: this.pool.getClientId(),
      Session: this.Session,
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }

      const challengeName = data.ChallengeName;

      if (challengeName === 'CUSTOM_CHALLENGE') {
        this.Session = data.Session;
        return callback.customChallenge(data.challengeParameters);
      }

      this.signInUserSession = this.getCognitoUserSession(data.AuthenticationResult);
      this.cacheTokens();
      return callback.onSuccess(this.signInUserSession);
    });
  }

  /**
   * This is used by the user once he has an MFA code
   * @param confirmationCode
   * @param callback
   * @returns {CognitoUserSession}
   */

  sendMFACode(confirmationCode, callback) {
    const challengeResponses = {};
    challengeResponses.USERNAME = this.username;
    challengeResponses.SMS_MFA_CODE = confirmationCode;

    if (this.deviceKey != null) {
      challengeResponses.DEVICE_KEY = this.deviceKey;
    }

    this.client.makeUnauthenticatedRequest('respondToAuthChallenge', {
      ChallengeName: 'SMS_MFA',
      ChallengeResponses: challengeResponses,
      ClientId: this.pool.getClientId(),
      Session: this.Session,
    }, (err, dataAuthenticate) => {
      if (err) {
        return callback.onFailure(err);
      }

      this.signInUserSession = this.getCognitoUserSession(dataAuthenticate.AuthenticationResult);
      this.cacheTokens();

      if (dataAuthenticate.AuthenticationResult.NewDeviceMetadata == null) {
        return callback.onSuccess(this.signInUserSession);
      }

      const authenticationHelper = new AuthenticationHelper(
        this.pool.getUserPoolId().split('_')[1],
        this.pool.getParanoia());
      // const deviceStuff = authenticationHelper.generateHashDevice(
      //   dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceGroupKey,
      //   dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceKey);

      const deviceSecretVerifierConfig = {
        Salt: sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(
          authenticationHelper.getSaltDevices().toString(16))),
        PasswordVerifier: sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(
          authenticationHelper.getVerifierDevices().toString(16))),
      };

      this.verifierDevices = sjcl.codec.base64.fromBits(
        authenticationHelper.getVerifierDevices());
      this.deviceGroupKey = dataAuthenticate.AuthenticationResult
        .NewDeviceMetadata.DeviceGroupKey;
      this.randomPassword = authenticationHelper.getRandomPassword();

      this.client.makeUnauthenticatedRequest('confirmDevice', {
        DeviceKey: dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceKey,
        AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
        DeviceSecretVerifierConfig: deviceSecretVerifierConfig,
        DeviceName: navigator.userAgent,
      }, (errConfirm, dataConfirm) => {
        if (errConfirm) {
          return callback.onFailure(errConfirm);
        }

        this.deviceKey = dataAuthenticate.AuthenticationResult.NewDeviceMetadata.DeviceKey;
        this.cacheDeviceKeyAndPassword();
        if (dataConfirm.UserConfirmationNecessary === true) {
          return callback.onSuccess(
            this.signInUserSession,
            dataConfirm.UserConfirmationNecessary);
        }
        return callback.onSuccess(this.signInUserSession);
      });
      return undefined;
    });
  }

  /**
   * This is used by an authenticated user to change the current password
   * @param oldUserPassword
   * @param newUserPassword
   * @param callback
   * @returns error or success
   */

  changePassword(oldUserPassword, newUserPassword, callback) {
    if (!(this.signInUserSession != null && this.signInUserSession.isValid())) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('changePassword', {
      PreviousPassword: oldUserPassword,
      ProposedPassword: newUserPassword,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used by an authenticated user to enable MFA for himself
   * @param callback
   * @returns error or success
   */

  enableMFA(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    const mfaOptions = [];
    const mfaEnabled = {
      DeliveryMedium: 'SMS',
      AttributeName: 'phone_number',
    };
    mfaOptions.push(mfaEnabled);

    this.client.makeUnauthenticatedRequest('setUserSettings', {
      MFAOptions: mfaOptions,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used by an authenticated user to disable MFA for himself
   * @param callback
   * @returns error or success
   */

  disableMFA(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    const mfaOptions = [];

    this.client.makeUnauthenticatedRequest('setUserSettings', {
      MFAOptions: mfaOptions,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }


  /**
   * This is used by an authenticated user to delete himself
   * @param callback
   * @returns error or success
   */

  deleteUser(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('deleteUser', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used by an authenticated user to change a list of attributes
   * @param attributes
   * @param callback
   * @returns error or success
   */

  updateAttributes(attributes, callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('updateUserAttributes', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      UserAttributes: attributes,
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used by an authenticated user to get a list of attributes
   * @param callback
   * @returns error or success
   */

  getUserAttributes(callback) {
    if (!(this.signInUserSession != null && this.signInUserSession.isValid())) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('getUser', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, (err, userData) => {
      if (err) {
        return callback(err, null);
      }

      const attributeList = [];

      for (let i = 0; i < userData.UserAttributes.length; i++) {
        const attribute = {
          Name: userData.UserAttributes[i].Name,
          Value: userData.UserAttributes[i].Value,
        };
        const userAttribute = new CognitoUserAttribute(attribute);
        attributeList.push(userAttribute);
      }

      return callback(null, attributeList);
    });
    return undefined;
  }

  /**
   * This is used by an authenticated user to delete a list of attributes
   * @param attributeList
   * @param callback
   * @returns error or success
   */

  deleteAttributes(attributeList, callback) {
    if (!(this.signInUserSession != null && this.signInUserSession.isValid())) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('deleteUserAttributes', {
      UserAttributeNames: attributeList,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used by a user to resend a confirmation code
   * @param callback
   * @returns error or success
   */

  resendConfirmationCode(callback) {
    this.client.makeUnauthenticatedRequest('resendConfirmationCode', {
      ClientId: this.pool.getClientId(),
      Username: this.username,
    }, err => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, 'SUCCESS');
    });
  }

  /**
   * This is used to get a session, either from the session object
   * or from  the local storage, or by using a refresh token
   *
   * @param callback
   * @returns error or session
   */

  getSession(callback) {
    if (this.username == null) {
      return callback(new Error('Username is null. Cannot retrieve a new session'), null);
    }

    if (this.signInUserSession != null && this.signInUserSession.isValid()) {
      return callback(null, this.signInUserSession);
    }

    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}.${this.username}`;
    const idTokenKey = `${keyPrefix}.idToken`;
    const accessTokenKey = `${keyPrefix}.accessToken`;
    const refreshTokenKey = `${keyPrefix}.refreshToken`;

    const storage = window.localStorage;

    if (storage.getItem(idTokenKey)) {
      const idToken = new CognitoIdToken({
        IdToken: storage.getItem(idTokenKey),
      });
      const accessToken = new CognitoAccessToken({
        AccessToken: storage.getItem(accessTokenKey),
      });
      const refreshToken = new CognitoRefreshToken({
        RefreshToken: storage.getItem(refreshTokenKey),
      });

      const sessionData = {
        IdToken: idToken,
        AccessToken: accessToken,
        RefreshToken: refreshToken,
      };
      const cachedSession = new CognitoUserSession(sessionData);
      if (cachedSession.isValid()) {
        this.signInUserSession = cachedSession;
        return callback(null, this.signInUserSession);
      }

      if (refreshToken.getToken() == null) {
        return callback(new Error('Cannot retrieve a new session. Please authenticate.'), null);
      }

      this.refreshSession(refreshToken, callback);
    }
    return undefined;
  }


  /**
   * This uses the refreshToken to retrieve a new session
   * @param refreshToken
   * @param callback
   * @returns error or new session
   */

  refreshSession(refreshToken, callback) {
    const authParameters = {};
    authParameters.REFRESH_TOKEN = refreshToken.getToken();
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}`;
    const lastUserKey = `${keyPrefix}.LastAuthUser`;
    const storage = window.localStorage;

    if (storage.getItem(lastUserKey)) {
      this.username = storage.getItem(lastUserKey);
      const deviceKeyKey = `${keyPrefix}.${this.username}.deviceKey`;
      this.deviceKey = storage.getItem(deviceKeyKey);
      authParameters.DEVICE_KEY = this.deviceKey;
    }

    this.client.makeUnauthenticatedRequest('initiateAuth', {
      ClientId: this.pool.getClientId(),
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: authParameters,
    }, (err, authResult) => {
      if (err) {
        return callback(err, null);
      }
      if (authResult) {
        const authenticationResult = authResult.AuthenticationResult;
        if (!Object.prototype.hasOwnProperty.call(authenticationResult, 'RefreshToken')) {
          authenticationResult.RefreshToken = refreshToken.getToken();
        }
        this.signInUserSession = this.getCognitoUserSession(authenticationResult);
        this.cacheTokens();
        return callback(null, this.signInUserSession);
      }
      return undefined;
    });
  }

  /**
   * This is used to save the session tokens to local storage
   */

  cacheTokens() {
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}`;
    const idTokenKey = `${keyPrefix}.${this.username}.idToken`;
    const accessTokenKey = `${keyPrefix}.${this.username}.accessToken`;
    const refreshTokenKey = `${keyPrefix}.${this.username}.refreshToken`;
    const lastUserKey = `${keyPrefix}.LastAuthUser`;

    const storage = window.localStorage;

    storage.setItem(idTokenKey, this.signInUserSession.getIdToken().getJwtToken());
    storage.setItem(accessTokenKey, this.signInUserSession.getAccessToken().getJwtToken());
    storage.setItem(refreshTokenKey, this.signInUserSession.getRefreshToken().getToken());
    storage.setItem(lastUserKey, this.username);
  }

  /**
   * This is used to cache the device key and device group and device password
   */

  cacheDeviceKeyAndPassword() {
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}.${this.username}`;
    const deviceKeyKey = `${keyPrefix}.deviceKey`;
    const randomPasswordKey = `${keyPrefix}.randomPasswordKey`;
    const deviceGroupKeyKey = `${keyPrefix}.deviceGroupKey`;

    const storage = window.localStorage;

    storage.setItem(deviceKeyKey, this.deviceKey);
    storage.setItem(randomPasswordKey, this.randomPassword);
    storage.setItem(deviceGroupKeyKey, this.deviceGroupKey);
  }

  /**
   * This is used to get current device key and device group and device password
   */

  getCachedDeviceKeyAndPassword() {
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}.${this.username}`;
    const deviceKeyKey = `${keyPrefix}.deviceKey`;
    const randomPasswordKey = `${keyPrefix}.randomPasswordKey`;
    const deviceGroupKeyKey = `${keyPrefix}.deviceGroupKey`;

    const storage = window.localStorage;

    if (storage.getItem(deviceKeyKey)) {
      this.deviceKey = storage.getItem(deviceKeyKey);
      this.randomPassword = storage.getItem(randomPasswordKey);
      this.deviceGroupKey = storage.getItem(deviceGroupKeyKey);
    }
  }

  /**
   * This is used to clear the device key info from local storage
   */

  clearCachedDeviceKeyAndPassword() {
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}.${this.username}`;
    const deviceKeyKey = `${keyPrefix}.deviceKey`;
    const randomPasswordKey = `${keyPrefix}.randomPasswordKey`;
    const deviceGroupKeyKey = `${keyPrefix}.deviceGroupKey`;

    const storage = window.localStorage;

    storage.removeItem(deviceKeyKey);
    storage.removeItem(randomPasswordKey);
    storage.removeItem(deviceGroupKeyKey);
  }

  /**
   * This is used to clear the session tokens from local storage
   */

  clearCachedTokens() {
    const keyPrefix = `CognitoIdentityServiceProvider.${this.pool.getClientId()}`;
    const idTokenKey = `${keyPrefix}.${this.username}.idToken`;
    const accessTokenKey = `${keyPrefix}.${this.username}.accessToken`;
    const refreshTokenKey = `${keyPrefix}.${this.username}.refreshToken`;
    const lastUserKey = `${keyPrefix}.LastAuthUser`;

    const storage = window.localStorage;

    storage.removeItem(idTokenKey);
    storage.removeItem(accessTokenKey);
    storage.removeItem(refreshTokenKey);
    storage.removeItem(lastUserKey);
  }

  /**
   * This is used to build a user session from tokens retrieved in the authentication result
   * @param authResult
   *
   */

  getCognitoUserSession(authResult) {
    const idToken = new CognitoIdToken(authResult);
    const accessToken = new CognitoAccessToken(authResult);
    const refreshToken = new CognitoRefreshToken(authResult);

    const sessionData = {
      IdToken: idToken,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    };

    return new CognitoUserSession(sessionData);
  }

  /**
   * This is used to initiate a forgot password request
   * @param callback
   * @returns error or success
   *
   */

  forgotPassword(callback) {
    this.client.makeUnauthenticatedRequest('forgotPassword', {
      ClientId: this.pool.getClientId(),
      Username: this.username,
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }
      if (typeof callback.inputVerificationCode === 'function') {
        return callback.inputVerificationCode(data);
      }
      return callback.onSuccess();
    });
  }

  /**
   * This is used to confirm a new password using a confirmationCode
   * @param confirmationCode
   * @param newPassword
   * @param callback
   * @returns error or success
   *
   */

  confirmPassword(confirmationCode, newPassword, callback) {
    this.client.makeUnauthenticatedRequest('confirmForgotPassword', {
      ClientId: this.pool.getClientId(),
      Username: this.username,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess();
    });
  }

  /**
   * This is used to initiate an attribute confirmation request
   * @param attributeName
   * @param callback
   * @returns error or success
   *
   */

  getAttributeVerificationCode(attributeName, callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('getUserAttributeVerificationCode', {
      AttributeName: attributeName,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.inputVerificationCode(data);
    });
    return undefined;
  }

  /**
   * This is used to confirm an attribute using a confirmation code
   * @param confirmationCode
   * @param attributeName
   * @param callback
   * @returns error or success
   *
   */

  verifyAttribute(attributeName, confirmationCode, callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('verifyUserAttribute', {
      AttributeName: attributeName,
      Code: confirmationCode,
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess('SUCCESS');
    });
    return undefined;
  }


  /**
   * This is used to get the device information using the current device key
   *
   * @param callback
   * @returns error or current device data
   */

  getDevice(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('getDevice', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      DeviceKey: this.deviceKey,
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess(data);
    });
    return undefined;
  }

  /**
   * This is used to forget the current device
   *
   * @param callback
   * @returns error or SUCCESS
   */

  forgetDevice(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('forgetDevice', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      DeviceKey: this.deviceKey,
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      this.deviceKey = null;
      this.deviceGroupkey = null;
      this.randomPassword = null;
      this.clearCachedDeviceKeyAndPassword();
      return callback.onSuccess('SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used to set the device status as remembered
   *
   * @param callback
   * @returns error or SUCCESS
   */

  setDeviceStatusRemembered(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('updateDeviceStatus', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      DeviceKey: this.deviceKey,
      DeviceRememberedStatus: 'remembered',
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess('SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used to set the device status as not remembered
   *
   * @param callback
   * @returns error or SUCCESS
   */

  setDeviceStatusNotRemembered(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('updateDeviceStatus', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      DeviceKey: this.deviceKey,
      DeviceRememberedStatus: 'not_remembered',
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess('SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used to list all devices for a user
   *
   * @param limit the number of devices returned in a call
   * @param paginationToken the pagination token in case any was returned before
   * @param callback
   * @returns error or device data and pagination token
   */

  listDevices(limit, paginationToken, callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('listDevices', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
      Limit: limit,
      PaginationToken: paginationToken,
    }, (err, data) => {
      if (err) {
        return callback.onFailure(err);
      }
      return callback.onSuccess(data);
    });
    return undefined;
  }

  /**
   * This is used to globally revoke all tokens issued to a user
   *
   * @param callback
   * @returns error or SUCCESS
   */

  globalSignOut(callback) {
    if (this.signInUserSession == null || !this.signInUserSession.isValid()) {
      return callback(new Error('User is not authenticated'), null);
    }

    this.client.makeUnauthenticatedRequest('globalSignOut', {
      AccessToken: this.signInUserSession.getAccessToken().getJwtToken(),
    }, err => {
      if (err) {
        return callback.onFailure(err);
      }
      this.clearCachedTokens();
      return callback.onSuccess('SUCCESS');
    });
    return undefined;
  }

  /**
   * This is used for the user to signOut of the application and clear the cached tokens.
   *
   */

  signOut() {
    this.signInUserSession = null;
    this.clearCachedTokens();
  }
}
