var gulp = require('gulp'),
	connect = require('gulp-connect');

var rootPath = './workflow/**/*.*';

//定义一个启动服务器的任务
gulp.task('server', function() {
	connect.server({
		root: 'workflow',
		port: 3030,
		livereload: true
	});
});
//刷新任务
gulp.task('refresh', function() {
	gulp.src(rootPath)
		.pipe(connect.reload());
});
//监听app下所有文件的变动
gulp.task('watch', function() {
	gulp.watch([rootPath], ['refresh']);
});

gulp.task('default', ['server', 'watch']);