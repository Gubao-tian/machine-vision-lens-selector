/* 构建单文件版本：从 index.template.html 读取骨架，把 CSS / JS 内联进 index.html
   规避部署环境对独立资源文件的鉴权拦截。
   注意：源文件是 index.template.html，产物是 index.html，切勿从 index.html 自身读取。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let html = read('index.template.html');
const css = read('css/style.css');
const dataJs = read('js/lens-data.js');
const appJs = read('js/app.js');

// 内联 CSS
html = html.replace(
  '<link rel="stylesheet" href="css/style.css">',
  '<style>\n' + css + '\n</style>'
);

// 内联 JS（注意顺序：数据在前，应用在后）
html = html.replace(
  '<script src="js/lens-data.js"></script>\n<script src="js/app.js"></script>',
  '<script>\n' + dataJs + '\n</script>\n<script>\n' + appJs + '\n</script>'
);

if (html.includes('href="css/style.css"') || html.includes('src="js/app.js"')) {
  console.error('内联失败：仍有外部资源引用');
  process.exit(1);
}

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('index.html（单文件版）已生成，体积 ' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
