/**
 * Created by nmondon on 22/08/2014.
 */

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');


// Concatenate & Minify JS
gulp.task('scripts', function () {
    var dependencies = [
        'public/js/bower_components/jquery/dist/jquery.js',
        'public/js/other_components/Three/three.min.js',
        'public/js/other_components/THREEx.FullScreen/THREEx.FullScreen.js',
        'public/js/bower_components/threex.windowresize/threex.windowresize.js',
        'public/js/other_components/Detector/Detector.js',
        'public/js/other_components/TrackballControls/TrackballControls.js',
        'public/js/bower_components/toxiclibsjs/build/toxiclibs.js',
        'public/js/other_components/delaunay/delaunay.js',
        'public/js/bower_components/d3/d3.min.js',
        'public/js/bower_components/queue-async/queue.js',
        'public/js/bower_components/lodash/dist/lodash.js',
        'public/js/lib/geosphere.js'
    ];

    return gulp.src(dependencies)
        .pipe(concat('all.js'))
        .pipe(gulp.dest('public/js/build'))
        .pipe(rename('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('public/js/build'));
});