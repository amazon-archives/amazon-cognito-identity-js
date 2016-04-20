# Amazon Cognito Identity SDK for JavaScript

You can now use Amazon Cognito to easily add user sign-up and sign-in to your mobile and web apps. Your User Pool in Amazon Cognito is a fully managed user directory that can scale to hundreds of millions of users, so you don't have to worry about building, securing, and scaling a solution to handle user management and authentication.

**Developer Preview:** We welcome developer feedback on this project. You can reach us by creating an issue on the 
GitHub repository or posting to the Amazon Cognito Identity forums:
* https://github.com/aws/amazon-cognito-identity-js

Introduction
============
The Amazon Cognito Identity SDK for JavaScript allows JavaScript enabled applications to sign-up users, authenticate users, view, delete, and update user attributes within the Amazon Cognito Identity service. Other functionality includes password changes for authenticated users and initiating and completing forgot password flows for unauthenticated users.

## Setup

1. Download and include the Amazon Cognito AWS SDK for JavaScript:
  * [/dist/aws-cognito-sdk.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/aws-cognito-sdk.min.js)

2. Download and include the Amazon Cognito Identity SDK for JavaScript:
  * [/dist/amazon-cognito-identity.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/amazon-cognito-identity.min.js)

3. Include the JavaScript BN library for BigInteger computations:
  * [JavaScript BN library](http://www-cs-students.stanford.edu/~tjw/jsbn/)

4. Include the Stanford Javascript Crypto Library:
  * [Stanford JavaScript Crypto Library](https://github.com/bitwiseshiftleft/sjcl)

   Please note, that by default the Stanford JavaScript Crypto Library doesn't include the bytes codec that the SDK uses so it must be included with the --with-codecBytes option when configuring the Stanford JavaScript Crypto Library.

5. Include Moment.js, a JavaScript library used for date manipulation:
  * [Moment.js](http://momentjs.com/)

6. Optionally, download and include the AWS JavaScript SDK in order to use other AWS services:
  * http://aws.amazon.com/sdk-for-browser/

<pre class="prettyprint">
    &lt;script src="/path/to/jsbn.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/jsbn2.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/sjcl.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/moment.min.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/aws-cognito-sdk-min.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/amazon-cognito-identity.min.js"&gt;&lt;/script&gt;
</pre>

## Usage

**Use case 1.** Registering a user with the application. One needs to create a CognitoUserPool object by providing a UserPoolId and a ClientId and signing up by using a username, password, attribute list, and validation data.

<pre class="prettyprint">
    AWS.config.region = 'us-east-1';
    var poolData = { UserPoolId : 'us-east-1_TcoKGbf7n',
                ClientId : '4pe2usejqcdmhi0a25jp4b5sh3'
    };
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

    var attributeList = [];
    
    var dataEmail = {
        Name : 'email',
        Value : 'email@mydomain.com'
    };
    var dataPhoneNumber = {
        Name : 'phone_number',
        Value : '+15555555555'
    };
    var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    var attributePhoneNumber = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhoneNumber);

    attributeList.push(attributeEmail);
    attributeList.push(attributePhoneNumber);

    userPool.signUp('username', 'password', attributeList, null, function(err, result){
        if (err) {
            alert(err);
            return;
        }
        cognitoUser = result.user;
        console.log('user name is ' + cognitoUser.getUsername());
    });
</pre>

**Use case 2.** Confirming a registered user using a confirmation code received via SMS.

<pre class="prettyprint">
    cognitoUser.confirmRegistration('123456', true, function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 3.** Resending a confirmation code via SMS for confirming registration.

<pre class="prettyprint">
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 4.** Authenticating a user and establishing a user session with the Amazon Cognito Identity service.

<pre class="prettyprint">
    var authenticationData = {
        Username : 'username',
        Password : 'password',
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('access token + ' + result.getAccessToken().getJwtToken());
        },

        onFailure: function(err) {
            alert(err);
        },

    });
</pre>

**Use case 5.** Retrieve user attributes for an authenticated user.

<pre class="prettyprint">
    cognitoUser.getUserAttributes(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        for (i = 0; i < result.length; i++) {
            console.log('attribute ' + result[i].getName() + ' has value ' + result[i].getValue());
        }
    });
</pre>

**Use case 6.** Verify user attribute for an authenticated user.

<pre class="prettyprint">
    cognitoUser.getAttributeVerificationCode('email', {
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        },
        inputVerificationCode() {
            var verificationCode = prompt('Please input verification code: ' ,'');
            cognitoUser.verifyAttribute('email', verificationCode, this);
        }
    });
</pre>

**Use case 7.** Delete user attribute for an authenticated user.

<pre class="prettyprint">
    var attributeList = [];
    attributeList.push('nickname');

    cognitoUser.deleteAttributes(attributeList, function(err, result) {
     	if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 8.** Update user attributes for an authenticated user.

<pre class="prettyprint">
    var attributeList = [];
    var attribute = {
        Name : 'nickname',
        Value : 'joe'
    };
    var attribute = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(attribute);
    attributeList.push(attribute);

    cognitoUser.updateAttributes(attributeList, function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 9.** Enabling MFA for a user on a pool that has an optional MFA setting for an authenticated user.

<pre class="prettyprint">
    cognitoUser.enableMFA(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 10.** Disabling MFA for a user on a pool that has an optional MFA setting for an authenticated user.

<pre class="prettyprint">
    cognitoUser.disableMFA(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 11.** Changing the current password for an authenticated user.

<pre class="prettyprint">
    cognitoUser.changePassword('oldPassword', 'newPassword', function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 12.** Starting and completing a forgot password flow for a user.

<pre class="prettyprint">
    cognitoUser.forgotPassword({
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        },
        inputVerificationCode() {
            var verificationCode = prompt('Please input verification code ' ,'');
            var newPassword = prompt('Enter new password ' ,'');
            cognitoUser.confirmPassword(verificationCode, newPassword, this);
        }
</pre>

**Use case 13.** Deleting an authenticated user.

<pre class="prettyprint">
    cognitoUser.deleteUser(function(err, result) {
        if (err) {
           	alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 14.** Signing out from the application.

<pre class="prettyprint">
    cognitoUser.signOut();
</pre>

**Use case 15.** Retrieving the current user from local storage.

<pre class="prettyprint">
    var data = { UserPoolId : 'us-east-1_Iqc3ajYLS',
                 ClientId : '2lavgo9l86pkdu353sm7khjj1q'
    };
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(data);
    var cognitoUser = userPool.getCurrentUser();

    if (cognitoUser != null) {
        cognitoUser.getSession(function(err, session) {
            if (err) {
           	    alert(err);
                return;
            }
            console.log('session validity: ' + session.isValid());
        });
    }
</pre>

## Network Configuration
The Amazon Cognito Identity JavaScript SDK will make requests to the following endpoints
* For Amazon Cognito Identity request handling: "https://cognito-idp.us-east-1.amazonaws.com"
  * This endpoint may change based on which region your Identity Pool was created in.
 
For most frameworks you can whitelist the domain by whitelisting all AWS endpoints with "*.amazonaws.com".

## Change Log
**v0.9.0:**
* Initial release. Developer preview.
