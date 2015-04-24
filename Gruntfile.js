module.exports = function(grunt) {

    // Project config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            copyindex: {
                src: 'index.html',
                dest: 'dev.html'
            }
        },
        useminPrepare: {
            html: 'index.html',
            options: {
                dest: './'
            }
        },
        usemin: {
            html: ['index.html'],
            options: {
                assetsDirs: ['build']
            }
        },
        jshint: {
            options: {
                //curly: true,
                eqeqeq: true,
                asi: true,
                sub: true, // don't enforce dot notation.  Local consistency matters.
                shadow: true, // allow variable declaration in 'for' statement.
                eqnull: true,
                browser: true,
                globals: {
                    jQuery: true
                },
            },
            uses_defaults: ['app/**/*.js',
                            '!app/build/*',
                            '!app/clients/*'],
        }


    });



    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    //grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-usemin');


    grunt.registerTask('build', ['copy:copyindex',
                                 'useminPrepare',
                                 'concat',
                                 'cssmin:generated',
                                 'uglify:generated',
                                 'usemin']);

    grunt.registerTask('lint', ['jshint']);


    //grunt.registerTask('default', ['ngAnnotate','uglify']);

};
