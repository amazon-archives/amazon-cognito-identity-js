# Amazon Cognito Identity Provider SDK for JavaScript

**Developer Preview:** We welcome developer feedback on this project. You can reach us by creating an issue on the 
GitHub repository or posting to the Amazon Cognito Identity Provider forums:
* https://github.com/aws/amazon-cognito-identity-js

Introduction
============
The Amazon Cognito Identity Provider SDK for JavaScript allows JavaScript enabled applications to sign-up users, authenticate users, view, delete, and update user attributes within the Amazon Cognito Identity Provider service. Other functionality includes password changes and initiating forgot password flows.

## Usage

**Use case 1.** Registering a user with the application. One needs to create a CognitoUserPool object by providing a UserPoolId and a ClientId and signing up by using a username, password, attribute list, and validation data.

<pre class="prettyprint">
    AWS.config.region = 'us-east-1';
    var poolData = { UserPoolId : 'us-east-1_TcoKGbf7n',
                ClientId : '4pe2usejqcdmhi0a25jp4b5sh3'
    };
    var userPool = new AWS.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

    var attributeList = [];
    
    var dataEmail = {
        Name : 'email',
        Value : 'email@mydomain.com'
    };
    var dataPhoneNumber = {
        Name : 'phone_number',
        Value : '+15555555555'
    };
    var attributeEmail = new AWS.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
    var attributePhoneNumber = new AWS.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhoneNumber);

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

**Use case 2.** Confirming a registered user using a confirmation code.

<pre class="prettyprint">
    cognitoUser.confirmRegistration('123456', true, function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 3.** Resending a confirmation code for confirming registration.

<pre class="prettyprint">
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
</pre>

**Use case 4.** Authenticating a user and establishing a user session with the Amazon Cognito Identity Provider service.

<pre class="prettyprint">
    var authenticationData = {
        Username : 'username',
        Password : 'password',
    };
    var authenticationDetails = new AWS.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('access token + ' + result.getAccessToken().getJwtToken());
        },

        onFailure: function(err) {
            alert(err);
        },

    });
</pre>

**Use case 5.** Retrieve user attributes.

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

**Use case 6.** Verify user attribute.

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


## Setup

1. Download and include the AWS JavaScript SDK:
  * http://aws.amazon.com/sdk-for-browser/

2. Download and include the Amazon Cognito Identity Provider SDK for JavaScript:
  * [/dist/amazon-cognito-identity.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/amazon-cognito-identity.min.js)

3. Include the JavaScript BN library for BigInteger computations:
  * [JavaScript BN library](http://www-cs-students.stanford.edu/~tjw/jsbn/jsbn.js)

4. Include the Stanford Javascript Crypto Library:
  * [Stanford JavaScript Crypto Library](https://github.com/bitwiseshiftleft/sjcl)

   Please note, that by default the Stanford JavaScript Crypto Library doesn't include the bytes codec so it must be included with the --with-codecBytes option when configuring.

5. Include Moment.js, a JavaScript library used for date manipulation:
  * [Moment.js](http://momentjs.com/)

<pre class="prettyprint">
    &lt;script src="/js/jsbn.js"&gt;&lt;/script&gt;
    &lt;script src="/js/sjcl.js"&gt;&lt;/script&gt;
    &lt;script src="/js/moment.min.js"&gt;&lt;/script&gt;
    &lt;script src="/js/aws-sdk.min.js"&gt;&lt;/script&gt;
    &lt;script src="/js/amazon-cognito-identity.min.js"&gt;&lt;/script&gt;
</pre>

## Network Configuration
The Amazon Cognito Identity Provider JavaScript SDK will make requests to the following endpoints
* For Amazon Cognito Identity Provider request handling: "https://cognito-idp.us-east-1.amazonaws.com"
  * This endpoint may change based on which region your Identity Pool was created in.
 
For most frameworks you can whitelist the domain by whitelisting all AWS endpoints with "*.amazonaws.com".

## Change Log
**v0.9.0:**
* Initial release. Developer preview.
