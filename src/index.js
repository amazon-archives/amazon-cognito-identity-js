'use strict';
// AWS SDK for JavaScript v2.3.4
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// License at https://sdk.amazonaws.com/js/BUNDLE_LICENSE.txt

const AWS = require('aws-sdk');
const BigInteger = require('big-integer');
const sjcl = require('sjcl');

const AWSCognitoUpdate = {
	AuthenticationDetails: require('./AuthenticationDetails'),
	AuthenticationHelper: require('./AuthenticationHelper'),
	CognitoAccessToken: require('./CognitoAccessToken'),
	CognitoIdToken: require('./CognitoIdToken'),
	CognitoRefreshToken: require('./CognitoRefreshToken'),
	CognitoUser: require('./CognitoUser'),
	CognitoUserAttribute: require('./CognitoUserAttribute'),
	CognitoUserPool: require('./CognitoUserPool'),
	CognitoUserSession: require('./CognitoUserSession'),
}

AWS.util.update(AWS.CognitoIdentity.prototype, AWSCognitoUpdate);

module.exports = AWS;
