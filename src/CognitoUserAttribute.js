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

export default class CognitoUserAttribute {
  /**
   * Constructs a new CognitoUserAttribute object
   * @param data - contains name, value pair for the attribute
   * @constructor
   */

  constructor(data) {
    data = data || {};

    this.Name = data.Name || '';
    this.Value = data.Value || '';
  }

  /**
   * Returns the record's value.
   * @returns {string}
   */

  getValue() {
    return this.Value;
  }

  /**
   * Sets the record's value.
   * @param value
   * @returns {CognitoUserAttribute}
   */

  setValue(value) {
    this.Value = value;
    return this;
  }

  /**
   * Returns the record's name.
   * @returns {string}
   */

  getName() {
    return this.Name;
  }

  /**
   * Sets the record's name
   * @param name
   * @returns {CognitoUserAttribute}
   */

  setName(name) {
    this.Name = name;
    return this;
  }

  /**
   * Returns a string representation of the record.
   * @returns {string}
   */

  toString() {
    return JSON.stringify(this);
  }

  /**
   * Returns a flat object representing the record.
   * @returns {object}
   */

  toJSON() {
    return {
      Name: this.Name,
      Value: this.Value,
    };
  }
}
