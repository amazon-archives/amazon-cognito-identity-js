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

export default class AuthenticationDetails {
  /**
   * Constructs a new AuthenticationDetails object
   * @param ValidationData {Array=}
   * @param Username {string}
   * @param Password {string}
   * @constructor
   */
  constructor({ ValidationData, Username, Password } = {}) {
    this.validationData = ValidationData || [];
    this.username = Username;
    this.password = Password;
  }

  /**
   * Returns the record's username
   * @returns {string}
   */

  getUsername() {
    return this.username;
  }

  /**
   * Returns the record's password
   * @returns {string}
   */

  getPassword() {
    return this.password;
  }

  /**
   * Returns the record's validationData
   * @returns {Array}
   */

  getValidationData() {
    return this.validationData;
  }
}
