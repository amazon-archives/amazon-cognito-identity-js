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

export default class CognitoIdToken {
  /**
   * Constructs a new CognitoIdToken object
   * @param IdToken {string=}
   * @constructor
   */

  constructor({ IdToken } = {}) {
    // Assign object
    this.jwtToken = IdToken || '';
  }

  /**
   * Returns the record's token.
   * @returns {string}
   */

  getJwtToken() {
    return this.jwtToken;
  }

  /**
   * Returns the token's expiration
   * @returns {integer}
   */

  getExpiration() {
    const payload = this.jwtToken.split('.')[1];
    const expiration = JSON.parse(
      sjcl.codec.utf8String.fromBits(sjcl.codec.base64.toBits(payload)));
    return expiration.exp;
  }
}
