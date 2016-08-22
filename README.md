# Amazon Cognito Identity SDK for JavaScript

You can now use Amazon Cognito to easily add user sign-up and sign-in to your mobile and web apps. Your User Pool in Amazon Cognito is a fully managed user directory that can scale to hundreds of millions of users, so you don't have to worry about building, securing, and scaling a solution to handle user management and authentication.

We welcome developer feedback on this project. You can reach us by creating an issue on the 
GitHub repository or posting to the Amazon Cognito Identity forums and the below blog post:
* https://github.com/aws/amazon-cognito-identity-js
* https://forums.aws.amazon.com/forum.jspa?forumID=173
* http://mobile.awsblog.com/post/Tx2O14ZY8A5LFHT/Accessing-Your-User-Pools-using-the-Amazon-Cognito-Identity-SDK-for-JavaScript

Introduction
============
The Amazon Cognito Identity SDK for JavaScript allows JavaScript enabled applications to sign-up users, authenticate users, view, delete, and update user attributes within the Amazon Cognito Identity service. Other functionality includes password changes for authenticated users and initiating and completing forgot password flows for unauthenticated users.

## Setup

1. Create an app for your user pool. Note that the generate client secret box must be **unchecked** because the JavaScript SDK doesn't support apps that have a client secret.

2. Download and include the Amazon Cognito AWS SDK for JavaScript:
  * [/dist/aws-cognito-sdk.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/aws-cognito-sdk.min.js)
  
   Note that the Amazon Cognito AWS SDK for JavaScript is just a slimmed down version of the AWS Javascript SDK namespaced as AWSCognito instead of AWS. It references only the Amazon Cognito Identity service.

3. Download and include the Amazon Cognito Identity SDK for JavaScript:
  * [/dist/amazon-cognito-identity.min.js](https://raw.githubusercontent.com/aws/amazon-cognito-identity-js/master/dist/amazon-cognito-identity.min.js)

4. Include the JavaScript BN library for BigInteger computations:
  * [JavaScript BN library](http://www-cs-students.stanford.edu/~tjw/jsbn/)

5. Include the Stanford Javascript Crypto Library:
  * [Stanford JavaScript Crypto Library](https://github.com/bitwiseshiftleft/sjcl)

6. Optionally, download and include the AWS JavaScript SDK in order to use other AWS services.
  * http://aws.amazon.com/sdk-for-browser/

<pre class="prettyprint">
    &lt;script src="/path/to/jsbn.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/jsbn2.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/sjcl.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/aws-cognito-sdk.min.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/amazon-cognito-identity.min.js"&gt;&lt;/script&gt;
    &lt;script src="/path/to/aws-sdk-2.3.5.js"&gt;&lt;/script&gt;
    
</pre>

Alternatively, you can use webpack to manage your dependencies.

## Usage

**Use case 1.** Registering a user with the application. One needs to create a CognitoUserPool object by providing a UserPoolId and a ClientId and signing up by using a username, password, attribute list, and validation data.

```javascript

    AWSCognito.config.region = 'us-east-1'; //This is required to derive the endpoint
        
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
            console.log('access token + ' + result.getAccessToken().getJwtToken());

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : '...' // your identity pool id here
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

```javascript
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

Note that the inputVerificationCode method needs to be defined but does not need to actually do anything. 
If you would like the user to input the confirmation code on another page, 
you can make inputVerificationCode call a no-op

```javascript
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
    cognitoUser.globalSignOut();
```

**Use case 16.** Retrieving the current user from local storage.

```javascript
    var data = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...' // Your client id here
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

            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : '...' // your identity pool id here
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

**Use case 18.** List all devices for an authenticated user. In this case, we need to pass a limit on the number of devices retrieved at a time and a pagination token is returned to make subsequent calls. The pagination token can be subsequently pasesed. When making the first call, the pagination token should be null.

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


## Network Configuration
The Amazon Cognito Identity JavaScript SDK will make requests to the following endpoints
* For Amazon Cognito Identity request handling: "https://cognito-idp.us-east-1.amazonaws.com"
  * This endpoint may change based on which region your Identity Pool was created in.
 
For most frameworks you can whitelist the domain by whitelisting all AWS endpoints with "*.amazonaws.com".

## Random numbers

In order to authenticate with the Amazon Cognito Identity Service, the client needs to generate a random number as part of the SRP protocol. Note that in some web browsers such as Internet Explorer 8, Internet Explorer 9, or versions 4.2 and 4.3 of the Android Browser, a default paranoia of 0 passed to the Stanford Javascript Crypto Library generates weak random numbers that might compromise client data. Developers should be careful when using the library in such an environment and call the sjcl.random.startCollectors() function before starting the Cognito authentication flow in order to collect entropy required for random number generation. Paranoia level should also be increased.
See discussion below:
* https://github.com/bitwiseshiftleft/sjcl/issues/77

Paranoia levels can be set through the constructor:

```javascript
    var poolData = {
        UserPoolId : '...', // Your user pool id here
        ClientId : '...', // Your client id here
        Paranoia : 7
    };

    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
    var userData = {
        Username : 'username',
        Pool : userPool
    };

    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
```

or by calling the object method:

```javascript
    userPool.setParanoia(7);
```

## Change Log

**Next**

* What's new

  * Nothing yet

* What has changed

  * Removed moment.js as a dependency.

**v1.0.0:**
* GA release. In this GA service launch, the following new features have been added to Amazon Cognito Your User Pools. 

*  Whats new

   * Webpack support.
   * Support for Custom authentication flows. Developes can implement custom authentication flows around Cognito Your User Pools. See developer documentation for details.
   * Devices support in User Pools. Users can remember devices and skip MFA verification for remebered devices. 
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
       * PasswordResetRequiredException: When administator has requested for a password reset for the user.

**v0.9.0:**
* Initial release. Developer preview.
