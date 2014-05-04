/*jslint node: true, nomen: true, todo: true, unparam: true */

module.exports = function (grunt) {
    'use strict';
    // Project configuration
    grunt.initConfig({
        // Metadata
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                node: true,
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                quotmark: 'single',
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                globals: {}
            },
            gruntfile: {
                src: 'gruntfile.js'
            },
            lib: {
                src: [
                    'index.js',
                    'lib/**/*.js'
                ]
            },
            lib_test: {
                src: [
                    'test/**/*.js'
                ]
            }
        },
        nodeunit: {
            'unit-test': ['test/**/*_test.js']
        },
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint', 'nodeunit']
            },
            lib: {
                files: '<%= jshint.lib.src %>',
                tasks: ['jshint:lib', 'nodeunit']
            },
            lib_test: {
                files: '<%= jshint.lib_test.src %>',
                tasks: ['jshint:lib_test', 'nodeunit']
            }
        }
    });

    // These plugins provide necessary tasks
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task
    grunt.registerTask('default', ['jshint', 'nodeunit']);
};