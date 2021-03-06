const path = require("path");
const fs = require("fs");
const gulp = require("gulp");
const gulpif = require('gulp-if');
const babel = require("gulp-babel");
const insert = require("gulp-insert");
const jsdom = require("jsdom");
const concat = require("gulp-concat");
const gap = require("gulp-append-prepend");
const run = require("run-sequence");
const replace = require("gulp-replace");
const postcss = require("gulp-html-postcss");
const autoprefixer = require("autoprefixer");
const htmlmin = require("gulp-htmlmin");
const uglify = require('gulp-uglify-es').default;

const { JSDOM } = jsdom;

gulp.task("scripts-es5", buildJS.bind(null, "es5"));

gulp.task("scripts-es6", buildJS.bind(null, "es6"));

function buildJS(mode) {
    return gulp.src("src/components/*.html")
        .pipe(concat(`app-${mode}.js`))
        .pipe(insert.transform(content => {
            const document = (new JSDOM(content)).window.document;
            const scriptsTags = document.querySelectorAll("script");
            const scriptsContents = Array.prototype.map.call(scriptsTags, tag => tag.textContent);
            return scriptsContents.join("");
        }))
        .pipe(gulpif(mode === 'es5', gap.prependFile("src/scaffolding.js")))
        .pipe(gulpif(mode === 'es5', babel({presets: ["env"]})))
        .pipe(uglify())
        .pipe(gulp.dest("dist"))
}

gulp.task("templates", () =>
    gulp.src("src/components/*.html")
        .pipe(insert.transform((content, file) => {
            const componentName = path.basename(file.path, ".html");
            const document = (new JSDOM(content)).window.document;
            const templatesTags = document.querySelectorAll("template");
            templatesTags.forEach(template => template.setAttribute("data-component", componentName));
            const templatesHTML = Array.prototype.map.call(templatesTags, tag => tag.outerHTML);
            return templatesHTML.join("");
        }))
        .pipe(concat("templates.html"))
        .pipe(postcss([
            autoprefixer()
        ]))
        .pipe(htmlmin({
            collapseWhitespace: true,
            conservativeCollapse: true,
            minifyCSS: true,
        }))
        .pipe(gulp.dest("dist"))
);

gulp.task("html", () =>
    gulp.src("src/index.html")
        .pipe(replace("@@templates", () => fs.readFileSync("./dist/templates.html")))
        .pipe(gulp.dest("dist"))
);

gulp.task("default", fn =>
    run(
        "scripts-es5",
        "scripts-es6",
        "templates",
        "html",
        fn
    )
);
