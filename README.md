# Amazon Cognito Identity Provider SDK for JavaScript

**Developer Preview:** We welcome developer feedback on this project. You can reach us by creating an issue on the 
GitHub repository or posting to the Amazon Cognito Identity Provider forums:
* https://github.com/aws/amazon-cognito-identity-js

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
 
For most frameworks you can whitelist both domains by whitelisting all AWS endpoints with "*.amazonaws.com".

## Change Log
**v0.9.0:**
* Initial release. Developer preview.
