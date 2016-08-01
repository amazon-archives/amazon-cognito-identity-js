module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        banner: '/**\n' +
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
        ' */\n\n',

        qunit: {
            all: ['tst/**/*.html']
        },

        jshint: {

            options: {
                browser: true,
                globals: {
                    AWS: true
                }
            },

            src: ['src/*.js']

        },

        jsdoc: {
            dist: {
                src: ['src/*.js'],
                options: {
                    destination: 'docs'
                }
            }
        },

        uglify: {
            options: {
                sourceMap: true,
                drop_console: true,
                banner: '<%= banner %>'
            },
            dist: {
                files: {
                    "dist/amazon-cognito-identity.min.js": [
                        'src/CognitoUser.js',
			'src/CognitoUserPool.js',
                        'src/CognitoRefreshToken.js',
                        'src/CognitoIdToken.js',
                        'src/CognitoAccessToken.js',
                        'src/AuthenticationDetails.js',
                        'src/CognitoUserSession.js',
                        'src/CognitoUserAttribute.js',
                        'src/AuthenticationHelper.js',
                        'src/DateHelper.js'
                    ]
                }
            }
        },

        watch: {
            scripts: {
                files: ['src/*.js'],
                tasks: ['uglify:dist']
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('default', ['qunit']);

};
