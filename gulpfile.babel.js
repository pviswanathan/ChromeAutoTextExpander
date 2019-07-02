// generated on 2016-05-08 using generator-chrome-extension 0.5.6
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import {stream as wiredep} from 'wiredep';

const $ = gulpLoadPlugins();

function extras(cb) {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    '!app/*.json',
    '!app/*.html',
  ], {
    base: 'app',
    dot: true
  }).pipe(gulp.dest('dist'));
}

export function lint(cb) {
  return gulp.src('app/scripts/**/*.js')
    .pipe($.eslint({
      env: {
        es6:false
      }
    }))
    .pipe($.eslint.format());
}

export function images(cb) {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/images'));
}

function html(cb) {
  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.sourcemaps.init())
    .pipe($.if(/^((?!(\.min)).)*\.js$/, $.stripDebug()))
    .pipe($.if(/^((?!(\.min)).)*\.js$/, $.uglify()))
    .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
    .pipe($.sourcemaps.write())
    .pipe($.if('*.html', $.htmlmin({removeComments: true, collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
}

function chromeManifest(cb) {
  return gulp.src('app/manifest.json')
    .pipe($.chromeManifest({
      buildnumber: true,
      background: {
        target: 'scripts/background.js',
        exclude: [
          'scripts/chromereload.js'
        ]
      }
  }))
  .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
  .pipe($.if(/^((?!(\.min)).)*\.js$/, $.stripDebug()))
  .pipe($.if(/^((?!(\.min)).)*\.js$/, $.sourcemaps.init()))
  .pipe($.if(/^((?!(\.min)).)*\.js$/, $.uglify()))
  .pipe($.if(/^((?!(\.min)).)*\.js$/, $.sourcemaps.write('.')))
  .pipe(gulp.dest('dist'));
}

export function clean(cb) {
  del(['.tmp', 'dist']);
  cb();
}

function watchFiles() {
  $.livereload.listen();
  gulp.watch('app/scripts/**/*.js', lint);
  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json'
  ], $.livereload.reload);
  // gulp.watch('bower.json', wiredepInit); // Deprecated now...
}
export const watch = gulp.series(lint, html, watchFiles);

function size() {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
}

function wiredepInit(cb) {
  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
  cb();
}

export function dist() {
  var manifest = require('./dist/manifest.json');
  return gulp.src('dist/**')
      .pipe($.zip('ATE-' + manifest.version + '.zip'))
      .pipe(gulp.dest('dist'));
}

export const build = gulp.series(
    lint,
    chromeManifest,
    gulp.parallel(html, images, extras),
    size
  );
export default gulp.series(clean, build);
