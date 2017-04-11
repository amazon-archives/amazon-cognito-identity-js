# Amazon Cognito Identity SDK for JavaScript

You can now use Amazon Cognito to easily add user sign-up and sign-in to your mobile and web apps. Your User Pool in Amazon Cognito is a fully managed user directory that can scale to hundreds of millions of users, so you don't have to worry about building, securing, and scaling a solution to handle user management and authentication.

We welcome developer feedback on this project. You can reach us by creating an issue on the
GitHub repository or posting to the Amazon Cognito Identity forums and the below blog post:
* https://github.com/aws/amazon-cognito-identity-js
* https://forums.aws.amazon.com/forum.jspa?forumID=173
* https://aws.amazon.com/blogs/mobile/accessing-your-user-pools-using-the-amazon-cognito-identity-sdk-for-javascript/

For an overview of the Cognito authentication flow, refer to the following blog post:
* https://aws.amazon.com/blogs/mobile/customizing-your-user-pool-authentication-flow/

Introduction
============
The Amazon Cognito Identity SDK for JavaScript allows JavaScript enabled applications to sign-up users, authenticate users, view, delete, and update user attributes within the Amazon Cognito Identity service. Other functionality includes password changes for authenticated users and initiating and completing forgot password flows for unauthenticated users.

Your users will benefit from a number of security features including SMS-based Multi-Factor Authentication (MFA) and account verification via phone or email. The password features use the Secure Remote Password (SRP) protocol to avoid sending cleartext passwords over the wire.

Setup
=====

The Amazon Cognito Identity SDK for JavaScript depends on:

1. The `CognitoIdentityServiceProvider` service from the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js)

There are two ways to install the Amazon Cognito Identity SDK for JavaScript and its dependencies,
depending on your project setup and experience with modern JavaScript build tools:

* Download each JavaScript library and include them in your HTML, or

* Install the dependencies with npm and use a bundler like webpack.

## Install using separate JavaScript files

This method is simpler and does not require additional tools, but may have worse performance due to
the browser having to download multiple files.

Download each of the following JavaScript files for the required libraries and place them in your
project:

1. The Amazon Cognito AWS SDK for JavaScript, from
   [/dist/aws-cognito-sdk.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/aws-cognito-sdk.min.js)

   Note that the Amazon Cognito AWS SDK for JavaScript is just a slimmed down version of the AWS
   Javascript SDK namespaced as `AWSCognito` instead of `AWS`. It references only the Amazon
   Cognito Identity service.

3. The Amazon Cognito Identity SDK for JavaScript, from
   [/dist/amazon-cognito-identity.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/amazon-cognito-identity.min.js)

Optionally, to use other AWS services, include a build of the [AWS SDK for JavaScript](http://aws.amazon.com/sdk-for-browser/).

Include all of the files in your HTML page before calling any Amazon Cognito Identity SDK APIs:

```html
    <script src="/path/to/aws-cognito-sdk.min.js"></script>
    <script src="/path/to/amazon-cognito-identity.min.js"></script>
    <!-- optional: only if you use other AWS services -->
    <script src="/path/to/aws-sdk-2.6.10.js"></script>
```

## Using NPM and Webpack

Webpack is a popular JavaScript bundling and optimization tool, it has many configuration features that can build your
source JavaScript into one or more files for distribution. The following is a quick setup guide with specific notes for
using the Amazon Cognito Identity SDK for JavaScript with it, but there are many more ways it can be used, see
[the Webpack site](https://webpack.github.io/), and in particular the
[configuration documentation](http://webpack.github.io/docs/configuration.html)

Note that webpack expects your source files to be structured as
[CommonJS (Node.js-style) modules](https://webpack.github.io/docs/commonjs.html)
(or [ECMAScript 2015 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
if you are using a transpiler such as [Babel](https://babeljs.io/).) If your project is not already using modules you
may wish to use [Webpack's module shimming features](http://webpack.github.io/docs/shimming-modules.html) to ease
migration.

* Install [Node.js](https://nodejs.org) on your development machine (this will not be needed on your server.)

* In your project add a `package.json`, either use `npm init` or the minimal:

  ```json
  {
    "private": true
  }
  ```

* Install the Amazon Cognito Identity SDK for JavaScript and the Webpack tool into your project with `npm` (the Node
  Package Manager, which is installed with Node.js):

  ```
  > npm install --save-dev webpack json-loader
  > npm install --save amazon-cognito-identity-js
  ```

  These will add a `node_modules` directory containing these tools and dependencies into your
  project, you will probably want to exclude this directory from source control. Adding the `--save`
  parameters will update the `package.json` file with instructions on what should be installed, so
  you can simply call `npm install` without any parameters to recreate this folder later.

* Create the configuration file for `webpack`, named `webpack.config.js`:

  ```js
  module.exports = {
    // Example setup for your project:
    // The entry module that requires or imports the rest of your project.
    // Must start with `./`!
    entry: './src/entry',
    // Place output files in `./dist/my-app.js`
    output: {
      path: 'dist',
      filename: 'my-app.js'
    },
    module: {
      loaders: [
        {
          test: /\.json$/,
          loader: 'json'
        }
      ]
    }
  };
  ```

* Add the following into your `package.json`

  ```json
  {
    "scripts": {
      "build": "webpack"
    }
  }
  ```

* Build your application bundle with `npm run build`


## Configuration

The Amazon Cognito Identity SDK for JavaScript requires two configuration values from your AWS
Account in order to access your Cognito User Pool:

* The User Pool Id, e.g. `us-east-1_aB12cDe34`
* A User Pool App Client Id, e.g. `7ghr5379orhbo88d52vphda6s9`
  * When creating the App, the generate client secret box must be **unchecked** because the
    JavaScript SDK doesn't support apps that have a client secret.

The [AWS Console for Cognito User Pools](https://console.aws.amazon.com/cognito/users/) can be used to get or create these values.

If you will be using Cognito Federated Identity to provide access to your AWS resources or Cognito Sync you will also need the Id of a Cognito Identity Pool that will accept logins from the above Cognito User Pool and App, i.e. `us-east-1:85156295-afa8-482c-8933-1371f8b3b145`.

Note that the various errors returned by the service are valid JSON so one can access the different exception types (err.code) and status codes (err.statusCode).

## Relevant examples

For an example using babel-webpack of a React setup, see [babel-webpack example](https://github.com/aws/amazon-cognito-identity-js/tree/master/examples/babel-webpack).

For a working example using angular, see [cognito-angular2-quickstart](https://github.com/awslabs/aws-cognito-angular2-quickstart).

If you are having issues when using Aurelia, please see the following [Stack Overflow post](http://stackoverflow.com/questions/39714424/how-can-i-get-the-amazon-cognito-identity-sdk-working-in-aurelia).

## Usage

The usage examples below use the unqualified names for types in the Amazon Cognito Identity SDK for JavaScript. Remember to import or qualify access to any of these types:

```javascript
    // When using loose Javascript files:
    var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;

    // Under the original name:
    var CognitoUserPool = AWSCognito.CognitoIndentityServiceProvider.CognitoUserPool;

    // Modules, e.g. Webpack:
    var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
    var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;

    // ES Modules, e.g. transpiling with Babel
    import { CognitoUserPool, CognitoUserAttribute, CognitoUser } from 'amazon-cognito-identity-js';
```

**Use case 1.** Registering a user with the application. One needs to create a CognitoUserPool object by providing a UserPoolId and a ClientId and signing up by using a username, password, attribute list, and validation data.

```javascript

    var poolData = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...' // Your client id here
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
```

**Use case 2.** Confirming a registered, unauthenticated user using a confirmation code received via SMS.

```javascript
    var poolData = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...' // Your client id here
    };

    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
    var userData = {
        Username : 'username',
        Pool : userPool
    };

    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.confirmRegistration('123456', true, function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 3.** Resending a confirmation code via SMS for confirming registration for a unauthenticated user.

```javascript
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 4.** Authenticating a user and establishing a user session with the Amazon Cognito Identity service.

```javascript
    var authenticationData = {
        Username : 'username',
        Password : 'password',
    };
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
    var poolData = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...' // Your client id here
    };
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
    var userData = {
        Username : 'username',
        Pool : userPool
    };
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            console.log('access token + ' + result.getIdToken().getJwtToken());

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : '...', // your identity pool id here
                Logins : {
                    // Change the key below according to the specific region your user pool is in.
                    'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>' : result.getIdToken().getJwtToken()
                }
            });

            // Instantiate aws sdk service objects now that the credentials have been updated.
            // example: var s3 = new AWS.S3();

        },

        onFailure: function(err) {
            alert(err);
        },

    });
```

Note that if device tracking is enabled for the user pool with a setting that user opt-in is required, you need to implement an onSuccess(result, userConfirmationNecessary) callback, collect user input and call either setDeviceStatusRemembered to remember the device or setDeviceStatusNotRemembered to not remember the device.

Note also that if CognitoUser.authenticateUser throws ReferenceError: navigator is not defined when running on Node.js, follow the instructions on the following [Stack Overflow post](http://stackoverflow.com/questions/40219518/aws-cognito-unauthenticated-login-error-window-is-not-defined-js).

**Use case 5.** Retrieve user attributes for an authenticated user.

```javascript
    cognitoUser.getUserAttributes(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        for (i = 0; i < result.length; i++) {
            console.log('attribute ' + result[i].getName() + ' has value ' + result[i].getValue());
        }
    });
```

**Use case 6.** Verify user attribute for an authenticated user.

Note that the inputVerificationCode method needs to be defined but does not need to actually do anything. If you would like the user to input the verification code on another page, you can set inputVerificationCode to null. If inputVerificationCode is null, onSuccess will be called immediately (assuming there is no error).

```javascript
    cognitoUser.getAttributeVerificationCode('email', {
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        },
        inputVerificationCode: function() {
            var verificationCode = prompt('Please input verification code: ' ,'');
            cognitoUser.verifyAttribute('email', verificationCode, this);
        }
    });
```

**Use case 7.** Delete user attribute for an authenticated user.

```javascript
    var attributeList = [];
    attributeList.push('nickname');

    cognitoUser.deleteAttributes(attributeList, function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 8.** Update user attributes for an authenticated user.

```javascript
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
```

**Use case 9.** Enabling MFA for a user on a pool that has an optional MFA setting for an authenticated user.

```javascript
    cognitoUser.enableMFA(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 10.** Disabling MFA for a user on a pool that has an optional MFA setting for an authenticated user.

```javascript
    cognitoUser.disableMFA(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 11.** Changing the current password for an authenticated user.

```javascript
    cognitoUser.changePassword('oldPassword', 'newPassword', function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 12.** Starting and completing a forgot password flow for an unauthenticated user.

```javascript
    cognitoUser.forgotPassword({
        onSuccess: function () {
            // successfully initiated reset password request
        },
        onFailure: function(err) {
            alert(err);
        },
        //Optional automatic callback
        inputVerificationCode: function(data) {
            console.log('Code sent to: ' + data);
            var verificationCode = prompt('Please input verification code ' ,'');
            var newPassword = prompt('Enter new password ' ,'');
            cognitoUser.confirmPassword(verificationCode, newPassword, this);
        }
    });
```



**Use case 13.** Deleting an authenticated user.

```javascript
    cognitoUser.deleteUser(function(err, result) {
        if (err) {
            alert(err);
            return;
        }
        console.log('call result: ' + result);
    });
```

**Use case 14.** Signing out from the application.

```javascript
    cognitoUser.signOut();
```

**Use case 15.** Global signout for an authenticated user(invalidates all issued tokens).

```javascript
    cognitoUser.globalSignOut(callback);
```

**Use case 16.** Retrieving the current user from local storage.

```javascript
    var poolData = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...' // Your client id here
    };
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
    var cognitoUser = userPool.getCurrentUser();

    if (cognitoUser != null) {
        cognitoUser.getSession(function(err, session) {
            if (err) {
                alert(err);
                return;
            }
            console.log('session validity: ' + session.isValid());

            // NOTE: getSession must be called to authenticate user before calling getUserAttributes
            cognitoUser.getUserAttributes(function(err, attributes) {
                if (err) {
                    // Handle error
                } else {
                    // Do something with attributes
                }
            });

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : '...', // your identity pool id here
                Logins : {
                    // Change the key below according to the specific region your user pool is in.
                    'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>' : session.getIdToken().getJwtToken()
                }
            });

            // Instantiate aws sdk service objects now that the credentials have been updated.
            // example: var s3 = new AWS.S3();

        });
    }
```

**Use case 17.** Integrating User Pools with Cognito Identity.

```javascript
    var cognitoUser = userPool.getCurrentUser();

    if (cognitoUser != null) {
        cognitoUser.getSession(function(err, result) {
            if (result) {
                console.log('You are now logged in.');

                // Add the User's Id Token to the Cognito credentials login map.
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: 'YOUR_IDENTITY_POOL_ID',
                    Logins: {
                        'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>': result.getIdToken().getJwtToken()
                    }
                });
            }
        });
    }
    //call refresh method in order to authenticate user and get new temp credentials
    AWS.config.credentials.refresh((error) => {
        if (error) {
            console.error(error);
        } else {
            console.log('Successfully logged!');
        }
    });
```
*note that you can not replace the login key with a variable because it will be interpreted literally. if you want to use a variable, the resolution to [issue 17](https://github.com/aws/amazon-cognito-identity-js/issues/162) has a working example*

**Use case 18.** List all remembered devices for an authenticated user. In this case, we need to pass a limit on the number of devices retrieved at a time and a pagination token is returned to make subsequent calls. The pagination token can be subsequently passed. When making the first call, the pagination token should be null.

```javascript

    cognitoUser.listDevices(limit, paginationToken, {
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        }
    });

```

**Use case 19.** List information about the current device.

```javascript

    cognitoUser.getDevice({
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        }
    });
```


**Use case 20.** Remember a device.

```javascript

    cognitoUser.setDeviceStatusRemembered({
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        }
    });
```

**Use case 21.** Do not remember a device.

```javascript

    cognitoUser.setDeviceStatusNotRemembered({
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        }
    });
```


**Use case 22.** Forget the current device.

```javascript

    cognitoUser.forgetDevice({
        onSuccess: function (result) {
            console.log('call result: ' + result);
        },
        onFailure: function(err) {
            alert(err);
        }
    });
```

**Use case 23.** Authenticate a user and set new password for a user that was created using AdminCreateUser API

```javascript

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            // User authentication was successful
        },

        onFailure: function(err) {
            // User authentication was not successful
        },

        mfaRequired: function(codeDeliveryDetails) {
            // MFA is required to complete user authentication.
            // Get the code from user and call
            cognitoUser.sendMFACode(mfaCode, this)
        },

        newPasswordRequired: function(userAttributes, requiredAttributes) {
            // User was signed up by an admin and must provide new
            // password and required attributes, if any, to complete
            // authentication.

            // the api doesn't accept this field back
            delete userAttributes.email_verified;

            // Get these details and call
            cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, this);
        }
    });
```
**Use case 24.** Retrieve the MFA Options for the user in case MFA is optional

```javascript
    cognitoUser.getMFAOptions(function(err, mfaOptions) {
        if (err) {
            alert(err);
            return;
        }
        console.log('MFA options for user ' + mfaOptions);
    });
```

## Network Configuration
The Amazon Cognito Identity JavaScript SDK will make requests to the following endpoints
* For Amazon Cognito Identity request handling: "https://cognito-idp.us-east-1.amazonaws.com"
  * This endpoint may change based on which region your Identity Pool was created in.

For most frameworks you can whitelist the domain by whitelisting all AWS endpoints with "*.amazonaws.com".

## Random numbers

In order to authenticate with the Amazon Cognito Identity Service, the client needs to generate a random number as part of the SRP protocol. The AWS SDK is only compatible with modern browsers, and these include support for cryptographically strong random values. If you do need to support older browsers then you should be aware that this is less secure, and if possible include a strong polyfill for `window.crypto.getRandomValues()` before including this library.

## Change Log
**v1.16.0:**
* What has changed
  * Brought in JSBN and updated Notice file.

**v1.15.0:**
* What has changed
  * Solved an issue that occurred rarely related to the padding of the U value that is used in computing the HKDF.

**v1.14.0:**
* What has changed
  * Importing only the CognitoIdentityServiceProvider client and util from the AWS SDK.

**v1.13.0:**
* What has changed
  * Removed SJCL as a dependency and fixed typescript typings.

**v1.12.0:**
* What has changed
  * Added typescript typings.

**v1.11.0:**
* What has changed
  * Added challenge parameters to the mfaRequired function of the return object.

**v1.10.0:**
* What has changed
  * Clearing tokens when they have been revoked and adding retrieval for MFAOptions.

**v1.9.0:**
* What has changed
  * Fixed dependency on local storage. Reverting to memory use when local storage is not available.

**v1.7.0:**
* What has changed
  * Fixed Cannot read property 'NewDeviceMetadata' of undefined bug.

**v1.6.0:**
* What has changed
  * Support for Admin create user flow. Users being signed up by admins will be able to authenticate using their one time passwords.

**v1.5.0:**
* What has changed
  * Changed webpack support to follow AWS-SDK usage.

**v1.2.0:**
* What has changed
  * Derived the region from the user pool id so the region doesn't need to be configured anymore.

**v1.1.0:**
* What has changed
   * Fixed a bug in token parsing.
   * Removed moment.js as a dependency.

**v1.0.0:**
* GA release. In this GA service launch, the following new features have been added to Amazon Cognito Your User Pools.

*  Whats new
   * Webpack support.
   * Support for Custom authentication flows. Developers can implement custom authentication flows around Cognito Your User Pools. See developer documentation for details.
   * Devices support in User Pools. Users can remember devices and skip MFA verification for remembered devices.
   * Scopes to control permissions for attributes in a User Pool.  
   * Configurable expiration time for refresh tokens.
   * Set custom FROM and REPLY-TO for email verification messages.
   * Search users in your pool using user attributes.
   * Global sign-out for a user.
   * Removed dependency to sjcl bytes codec.

* What has changed
   * Authentication flow in Javascript SDK now uses Custom Authentication API
   * Two new exceptions added for the authentication APIs: These exceptions have been added to accurately represent the user state when the username is invalid and when the user is not confirmed. You will have to update your application to handle these exceptions.
       * UserNotFoundException: Returned when the username user does not exist.
       * UserNotConfirmedException: Returned when the user has not been confirmed.
       * PasswordResetRequiredException: When administrator has requested for a password reset for the user.

**v0.9.0:**
* Initial release. Developer preview.
