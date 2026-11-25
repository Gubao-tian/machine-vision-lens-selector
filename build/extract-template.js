/* 一次性工具：从单文件 index.html 反向提取源码，生成可维护的模板结构
   产出：
     - index.template.html  HTML 骨架 + 外链引用（构建源）
     - css/style.css        从内联 <style> 提取
     - js/lens-data.js      从第一个内联 <script> 提取
     - js/app.js            从第二个内联 <script> 提取
   运行一次后即可改源码，再用 build-standalone.js 重建 index.html。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const STYLE_OPEN = '<style>';
const STYLE_CLOSE = '</style>';
const SCRIPT_OPEN = '<script>';
const SCRIPT_CLOSE = '</script>';

/* ---- 提取 style ---- */
const s0 = html.indexOf(STYLE_OPEN);
const s1 = html.indexOf(STYLE_CLOSE, s0);
if (s0 < 0 || s1 < 0) throw new Error('未找到内联样式块');
const css = html.slice(s0 + STYLE_OPEN.length, s1);

/* ---- 提取两段 script ---- */
const scripts = [];
let cursor = 0;
while (scripts.length < 2) {
  const a = html.indexOf(SCRIPT_OPEN, cursor);
  if (a < 0) break;
  const b = html.indexOf(SCRIPT_CLOSE, a);
  if (b < 0) break;
  scripts.push({ start: a, end: b + SCRIPT_CLOSE.length, code: html.slice(a + SCRIPT_OPEN.length, b) });
  cursor = b + SCRIPT_CLOSE.length;
}
if (scripts.length < 2) throw new Error('未找到两段内联脚本');

/* ---- 写回源码（以单文件为准，确保起点一致） ---- */
fs.writeFileSync(path.join(ROOT, 'css', 'style.css'), css.replace(/^\n/, '').replace(/\n$/, '') + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'js', 'lens-data.js'), scripts[0].code.replace(/^\n/, '').replace(/\n$/, '') + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'js', 'app.js'), scripts[1].code.replace(/^\n/, '').replace(/\n$/, '') + '\n', 'utf8');

/* ---- 生成模板：从后往前替换，避免索引失效 ---- */
const linkTag = '<link rel="stylesheet" href="css/style.css">';
const scriptTags = '<script src="js/lens-data.js"></script>\n<script src="js/app.js"></script>';

let tpl = html;
// 第二段 script 先替换
tpl = tpl.slice(0, scripts[1].start) + '<__SCRIPT2__>' + tpl.slice(scripts[1].end);
// 第一段 script
tpl = tpl.slice(0, scripts[0].start) + '<__SCRIPT1__>' + tpl.slice(scripts[0].end);
// style
tpl = tpl.slice(0, s0) + '<__STYLE__>' + tpl.slice(s1 + STYLE_CLOSE.length);

tpl = tpl.replace('<__STYLE__>', linkTag)
         .replace('<__SCRIPT1__>\n<__SCRIPT2__>', scriptTags)
         .replace('<__SCRIPT1__>', scriptTags.split('\n')[0])
         .replace('<__SCRIPT2__>', scriptTags.split('\n')[1]);

fs.writeFileSync(path.join(ROOT, 'index.template.html'), tpl, 'utf8');

console.log('提取完成：');
console.log('  css/style.css   ' + (Buffer.byteLength(css) / 1024).toFixed(1) + ' KB');
console.log('  js/lens-data.js ' + (Buffer.byteLength(scripts[0].code) / 1024).toFixed(1) + ' KB');
console.log('  js/app.js       ' + (Buffer.byteLength(scripts[1].code) / 1024).toFixed(1) + ' KB');
console.log('  index.template.html ' + (Buffer.byteLength(tpl) / 1024).toFixed(1) + ' KB');
