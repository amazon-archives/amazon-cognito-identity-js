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
"use strict";
var sjcl = require('sjcl');
var BigInteger = require('jsbn').BigInteger;

const initN = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1'
  + '29024E088A67CC74020BBEA63B139B22514A08798E3404DD'
  + 'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245'
  + 'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED'
  + 'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D'
  + 'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F'
  + '83655D23DCA3AD961C62F356208552BB9ED529077096966D'
  + '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B'
  + 'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9'
  + 'DE2BCBF6955817183995497CEA956AE515D2261898FA0510'
  + '15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64'
  + 'ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7'
  + 'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B'
  + 'F12FFA06D98A0864D87602733EC86A64521F2B18177B200C'
  + 'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31'
  + '43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';

const newPasswordRequiredChallengeUserAttributePrefix = 'userAttributes.';

/** @class */
module.exports = class AuthenticationHelper {
  /**
   * Constructs a new AuthenticationHelper object
   * @param {string} PoolName Cognito user pool name.
   * @param {int} paranoia Random number generation paranoia level.
   */
  constructor(PoolName, paranoia) {
    this.N = new BigInteger(initN, 16);
    this.g = new BigInteger('2');
    this.k = new BigInteger(this.hexHash(`00${this.N.toString(16)}0${this.g.toString(16)}`), 16);

    this.paranoia = paranoia;

    this.smallAValue = this.generateRandomSmallA();
    this.largeAValue = this.calculateA(this.smallAValue);

    this.infoBits = sjcl.codec.utf8String.toBits('Caldera Derived Key');

    this.poolName = PoolName;
  }

  /**
   * @returns {BigInteger} small A, a random number
   */
  getSmallAValue() {
    return this.smallAValue;
  }

  /**
   * @returns {BigInteger} large A, a value generated from small A
   */
  getLargeAValue() {
    return this.largeAValue;
  }

  /**
   * helper function to generate a random big integer
   * @returns {BigInteger} a random value.
   * @private
   */
  generateRandomSmallA() {
    const words = sjcl.random.randomWords(32, this.paranoia);
    const hexRandom = sjcl.codec.hex.fromBits(words);

    const randomBigInt = new BigInteger(hexRandom, 16);
    const smallABigInt = randomBigInt.mod(this.N);

    return smallABigInt;
  }

  /**
   * helper function to generate a random string
   * @returns {string} a random value.
   * @private
   */
  generateRandomString() {
    const words = sjcl.random.randomWords(10, this.paranoia);
    const stringRandom = sjcl.codec.base64.fromBits(words);

    return stringRandom;
  }

  /**
   * @returns {string} Generated random value included in password hash.
   */
  getRandomPassword() {
    return this.randomPassword;
  }

  /**
   * @returns {string} Generated random value included in devices hash.
   */
  getSaltDevices() {
    return this.SaltToHashDevices;
  }

  /**
   * @returns {string} Value used to verify devices.
   */
  getVerifierDevices() {
    return this.verifierDevices;
  }

  /**
   * Generate salts and compute verifier.
   * @param {string} deviceGroupKey Devices to generate verifier for.
   * @param {string} username User to generate verifier for.
   * @returns {void}
   */
  generateHashDevice(deviceGroupKey, username) {
    this.randomPassword = this.generateRandomString();
    const combinedString = `${deviceGroupKey}${username}:${this.randomPassword}`;
    const hashedString = this.hash(combinedString);

    const words = sjcl.random.randomWords(4, this.paranoia);
    const hexRandom = sjcl.codec.hex.fromBits(words);
    const saltDevices = new BigInteger(hexRandom, 16);
    const firstCharSalt = saltDevices.toString(16)[0];
    this.SaltToHashDevices = saltDevices.toString(16);

    if (saltDevices.toString(16).length % 2 === 1) {
      this.SaltToHashDevices = `0${this.SaltToHashDevices}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharSalt) !== -1) {
      this.SaltToHashDevices = `00${this.SaltToHashDevices}`;
    }
    const verifierDevicesNotPadded = this.g.modPow(
      new BigInteger(this.hexHash(this.SaltToHashDevices + hashedString), 16),
      this.N);

    const firstCharVerifierDevices = verifierDevicesNotPadded.toString(16)[0];
    this.verifierDevices = verifierDevicesNotPadded.toString(16);

    if (verifierDevicesNotPadded.toString(16).length % 2 === 1) {
      this.verifierDevices = `0${this.verifierDevices}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharVerifierDevices) !== -1) {
      this.verifierDevices = `00${this.verifierDevices}`;
    }
  }

  /**
   * Calculate the client's public value A = g^a%N
   * with the generated random number a
   * @param {BigInteger} a Randomly generated small A.
   * @returns {BigInteger} Computed large A.
   * @private
   */
  calculateA(a) {
    const A = this.g.modPow(a, this.N);

    if (A.mod(this.N).toString() === '0') {
      throw new Error('Illegal paramater. A mod N cannot be 0.');
    }
    return A;
  }

  /**
   * Calculate the client's value U which is the hash of A and B
   * @param {BigInteger} A Large A value.
   * @param {BigInteger} B Server B value.
   * @returns {BigInteger} Computed U value.
   * @private
   */
  calculateU(A, B) {
    const firstCharA = A.toString(16)[0];
    const firstCharB = B.toString(16)[0];
    let AToHash = A.toString(16);
    let BToHash = B.toString(16);

    if (A.toString(16).length % 2 === 1) {
      AToHash = `0${AToHash}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharA) !== -1) {
      AToHash = `00${AToHash}`;
    }

    if (B.toString(16).length % 2 === 1) {
      BToHash = `0${BToHash}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharB) !== -1) {
      BToHash = `00${BToHash}`;
    }

    this.UHexHash = this.hexHash(AToHash + BToHash);
    const finalU = new BigInteger(this.UHexHash, 16);

    return finalU;
  }

  /**
   * Calculate a hash from a bitArray
   * @param {sjcl.bitArray} bitArray Value to hash.
   * @returns {String} Hex-encoded hash.
   * @private
   */
  hash(bitArray) {
    const hashHex = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(bitArray));
    return (new Array(64 - hashHex.length).join('0')) + hashHex;
  }

  /**
   * Calculate a hash from a hex string
   * @param {String} hexStr Value to hash.
   * @returns {String} Hex-encoded hash.
   * @private
   */
  hexHash(hexStr) {
    const hashHex = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(sjcl.codec.hex.toBits(hexStr)));
    return (new Array(64 - hashHex.length).join('0')) + hashHex;
  }

  /**
   * Standard hkdf algorithm
   * @param {sjcl.bitArray} ikm Input key material.
   * @param {sjcl.bitArray} salt Salt value.
   * @returns {sjcl.bitArray} Strong key material.
   * @private
   */
  computehkdf(ikm, salt) {
    const mac = new sjcl.misc.hmac(salt, sjcl.hash.sha256);
    mac.update(ikm);
    const prk = mac.digest();
    const hmac = new sjcl.misc.hmac(prk, sjcl.hash.sha256);
    const infoBitsUpdate = sjcl.bitArray.concat(
      this.infoBits,
      sjcl.codec.utf8String.toBits(String.fromCharCode(1)));
    hmac.update(infoBitsUpdate);

    return sjcl.bitArray.clamp(hmac.digest(), 128);
  }

  /**
   * Calculates the final hkdf based on computed S value, and computed U value and the key
   * @param {String} username Username.
   * @param {String} password Password.
   * @param {BigInteger} serverBValue Server B value.
   * @param {BigInteger} salt Generated salt.
   * @returns {sjcl.bitArray} Computed HKDF value.
   */
  getPasswordAuthenticationKey(username, password, serverBValue, salt) {
    if (serverBValue.mod(this.N).equals(new BigInteger('0', 16))) {
      throw new Error('B cannot be zero.');
    }

    this.UValue = this.calculateU(this.largeAValue, serverBValue);

    if (this.UValue.equals(new BigInteger('0', 16))) {
      throw new Error('U cannot be zero.');
    }

    const usernamePassword = `${this.poolName}${username}:${password}`;
    const usernamePasswordHash = this.hash(usernamePassword);

    const firstCharSalt = salt.toString(16)[0];
    let SaltToHash = salt.toString(16);

    if (salt.toString(16).length % 2 === 1) {
      SaltToHash = `0${SaltToHash}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharSalt) !== -1) {
      SaltToHash = `00${SaltToHash}`;
    }

    const xValue = new BigInteger(this.hexHash(SaltToHash + usernamePasswordHash), 16);

    const gModPowXN = this.g.modPow(xValue, this.N);
    const intValue2 = serverBValue.subtract(this.k.multiply(gModPowXN));
    const sValue = intValue2.modPow(
      this.smallAValue.add(this.UValue.multiply(xValue)),
      this.N
    ).mod(this.N);

    let SToHash = sValue.toString(16);
    const firstCharS = sValue.toString(16)[0];

    if (sValue.toString(16).length % 2 === 1) {
      SToHash = `0${SToHash}`;
    } else if ('89ABCDEFabcdef'.indexOf(firstCharS) !== -1) {
      SToHash = `00${SToHash}`;
    }

    let UValueToHash = this.UHexHash;
    const firstCharU = this.UHexHash[0];

    if (this.UHexHash.length % 2 === 1) {
      UValueToHash = `0${UValueToHash}`;
    } else if (this.UHexHash.length % 2 === 0 && '89ABCDEFabcdef'.indexOf(firstCharU) !== -1) {
      UValueToHash = `00${UValueToHash}`;
    }

    const hkdf = this.computehkdf(
      sjcl.codec.hex.toBits(SToHash),
      sjcl.codec.hex.toBits(UValueToHash));

    return hkdf;
  }

  /**
  * Return constant newPasswordRequiredChallengeUserAttributePrefix
  * @return {newPasswordRequiredChallengeUserAttributePrefix} constant prefix value
  */
  getNewPasswordRequiredChallengeUserAttributePrefix() {
    return newPasswordRequiredChallengeUserAttributePrefix;
  }
}
