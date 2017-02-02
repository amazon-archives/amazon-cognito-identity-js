/* eslint-disable */
var webpack = require('webpack');

var banner = '/*!\n' +
' * Copyright 2016 Amazon.com,\n' +
' * Inc. or its affiliates. All Rights Reserved.\n' +
' * \n' +
' * Licensed under the Amazon Software License (the "License").\n' +
' * You may not use this file except in compliance with the\n' +
' * License. A copy of the License is located at\n' +
' * \n' +
' *     http://aws.amazon.com/asl/\n' +
' * \n' +
' * or in the "license" file accompanying this file. This file is\n' +
' * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR\n' +
' * CONDITIONS OF ANY KIND, express or implied. See the License\n' +
' * for the specific language governing permissions and\n' +
' * limitations under the License. \n' +
' */\n\n';

module.exports = {
  entry: './enhance',
  output: {
    path: 'dist',
    filename: 'amazon-cognito-identity.min.js',
    libraryTarget: 'umd',
    library: 'AmazonCognitoIdentity'
  },
  devtool: 'source-map',
  externals: {
    // This umd context config isn't in configuration documentation, but see example:
    // https://github.com/webpack/webpack/tree/master/examples/externals
    'aws-sdk': {
      root: ['AWSCognito'],
      commonjs2: 'aws-sdk',
      commonjs: 'aws-sdk',
      amd: 'aws-sdk'
    },
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.BannerPlugin(banner, { raw: true })
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          cacheDirectory: './node_modules/.cache/babel'
        }
      }
    ]
  }
};
