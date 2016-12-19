/*!
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

let _data = {};
let _storage = window.localStorage;

/** @class */
class MemoryStorage {
  static setItem(key, value) {
    return _data[key] = value;
  };

  static getItem(key) {
    return _data.hasOwnProperty(key) ? _data[key] : undefined;
  };

  static removeItem(key) {
    return delete _data[key];
  };

  static clear() {
    return _data = {};
  };
}

/** @class */
export default class StorageHelper {
  constructor() {
    try {
      _storage.setItem('aws.cognito.test-ls', 1);
      _storage.removeItem('aws.cognito.test-ls');
    } catch (exception) {
      _storage = MemoryStorage;
    }
  };

  getStorage() {
    return _storage;
  }
}
