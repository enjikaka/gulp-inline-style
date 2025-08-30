# gulp-inline-style

A simple gulp plugin to inline `<link>` stylesheets based on id.

## Usage
```js
import inlineStyle from 'gulp-inline-style';

gulp.src('src/*.html')
  .pipe(inlineStyle(['main-css', 'theme-css']))
  .pipe(gulp.dest('dist'));
```
