/**
 * Created by Cyprien on 29/10/2014.
 */

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typescript_export: {
            typings: {
                src: ['lib/*/*.d.ts'],
                dest: 'index.d.ts'
            }
        }
    });

    grunt.registerTask('hello', 'Hello world task.', function() {
        grunt.log.write('Hello world from grunt').ok();
    });

    grunt.loadNpmTasks('grunt-typescript-export');

    grunt.registerTask('typings', ['typescript_export']);

}