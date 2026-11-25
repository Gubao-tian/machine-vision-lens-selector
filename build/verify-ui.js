/* 浏览器端验证：加载生成的单文件 index.html，注入两组工况，
   把关键渲染结果写入 #VERIFY 节点，供 --dump-dom 抓取。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dir = path.join(ROOT, '.verify');
fs.mkdirSync(dir, { recursive: true });

function make(name, setup) {
  const script = `
<script>
document.addEventListener('DOMContentLoaded', function () {
  var parts = [];
  try {
    ${setup}
    render();
    parts.push('lensCount=' + (LAST.passed ? LAST.passed.length : -1));
    parts.push('camShown=' + document.querySelectorAll('#out-cams .lens-card').length);
    parts.push('lensShown=' + document.querySelectorAll('#out-lenses .lens-card').length);
    parts.push('lightShown=' + document.querySelectorAll('#out-lights .light-card').length);
    parts.push('lightBrands=' + [...new Set((LAST.lightRec ? LAST.lightRec.lights : []).map(function(p){return p.light.brand;}))].join('+'));
    parts.push('lightTopForm=' + (LAST.lightRec && LAST.lightRec.lights[0] ? LAST.lightRec.lights[0].light.form : 'none'));
    parts.push('sceneLabel=' + (LAST.lightRec && LAST.lightRec.scene ? LAST.lightRec.scene.label : 'none'));
    parts.push('targetLabel=' + (LAST.lightRec && LAST.lightRec.target ? LAST.lightRec.target.label : 'none'));
    parts.push('top=' + (LAST.passed && LAST.passed[0] ? LAST.passed[0].lens.model : 'none'));
    parts.push('topF=' + (LAST.passed && LAST.passed[0] ? LAST.passed[0].lens.f : 0));
    parts.push('lensBrands=' + [...new Set((LAST.passed || []).map(function(p){return p.lens.brand;}))].join('+'));
    parts.push('fTarget=' + LAST.fTarget.toFixed(1));
    var apply = document.querySelector('.btn-apply-wd');
    parts.push('rescueBtn=' + (apply ? apply.dataset.wd : 'none'));
    parts.push('lensTabText=' + (document.getElementById('out-lenses').textContent || '').slice(0, 40).replace(/\\s+/g, ' '));
    var sc = document.getElementById('out-stitch');
    parts.push('stitchText=' + (sc ? sc.textContent.replace(/\\s+/g, ' ').slice(0, 90) : 'none'));
    parts.push('stitchGrid=' + (sc ? sc.querySelectorAll('.stitch-grid i').length : -1));
  } catch (e) {
    parts.push('ERROR=' + e.message);
  }
  var d = document.createElement('pre');
  d.id = 'VERIFY';
  d.textContent = parts.join(' | ');
  document.body.appendChild(d);
});
</script>`;
  const pos = html.lastIndexOf('</body>');
  const out = html.slice(0, pos) + script + '\n' + html.slice(pos);
  fs.writeFileSync(path.join(dir, name), out, 'utf8');
  console.log('generated', name);
}

/* 工况一：截图工况 FOV50x30 / 精度0.12 / WD400 / 2448x2048 相机 → 应匹配 75mm */
make('case-screenshot.html', `
  document.getElementById('in-fovw').value = 50;
  document.getElementById('in-fovh').value = 30;
  document.getElementById('in-tol').value = 0.12;
  document.getElementById('in-wd').value = 400;
  document.getElementById('in-hd').value = 1;
  S.camMode = 'manual';
  S.manual = { w: 2448, h: 2048, px: 3.45, fmt: '2/3"', mount: 'C' };
`);

/* 工况三：通用宽松工况（自动相机）→ 检验相机/镜头/光源展示上限放宽后新品牌露出 */
make('case-display-caps.html', `
  document.getElementById('in-fovw').value = 80;
  document.getElementById('in-fovh').value = 60;
  document.getElementById('in-tol').value = 0.2;
  document.getElementById('in-wd').value = 300;
  document.getElementById('in-hd').value = 1;
  S.camMode = 'auto';
  S.lightScene = 'general';
  S.lightTarget = 'defect';
  S.lightReflect = 'mid';
`);

/* 工况四：新增产线分类 PCB + OCR → 新场景/目标须在浏览器端真实出结果 */
make('case-new-types.html', `
  document.getElementById('in-fovw').value = 100;
  document.getElementById('in-fovh').value = 70;
  document.getElementById('in-tol').value = 0.2;
  document.getElementById('in-wd').value = 300;
  document.getElementById('in-hd').value = 1;
  S.camMode = 'auto';
  document.getElementById('in-light-scene').value = 'pcb';
  document.getElementById('in-light-target').value = 'ocr';
  S.lightReflect = 'mid';
`);

/* 工况二：FOV40x30 / WD1000 → 所需焦距约 190mm 超范围，应出现应用 WD 按钮 */
make('case-rescue.html', `
  document.getElementById('in-fovw').value = 40;
  document.getElementById('in-fovh').value = 30;
  document.getElementById('in-tol').value = 0.12;
  document.getElementById('in-wd').value = 1000;
  document.getElementById('in-hd').value = 1;
  S.camMode = 'manual';
  S.manual = { w: 2448, h: 2048, px: 3.45, fmt: '2/3"', mount: 'C' };
`);

/* 工况五：多相机拼接开关打开，FOV800x600 / 精度0.3 → 需 2×2=4 台 */
make('case-stitch.html', `
  document.getElementById('in-fovw').value = 800;
  document.getElementById('in-fovh').value = 600;
  document.getElementById('in-tol').value = 0.3;
  document.getElementById('in-wd').value = 800;
  document.getElementById('in-hd').value = 1;
  document.getElementById('in-stitch').checked = true;
  S.camMode = 'auto';
`);

/* 工况六：拼接但精度0.1 → 25台，应标记不可行且给出替代建议 */
make('case-stitch-impractical.html', `
  document.getElementById('in-fovw').value = 800;
  document.getElementById('in-fovh').value = 600;
  document.getElementById('in-tol').value = 0.1;
  document.getElementById('in-wd').value = 800;
  document.getElementById('in-stitch').checked = true;
  S.camMode = 'auto';
`);

/* 工况七：经济预算 + 常规工况 → 应露出 Kowa JC / VST 等新增经济型镜头 */
make('case-expanded-brands.html', `
  document.getElementById('in-fovw').value = 60;
  document.getElementById('in-fovh').value = 45;
  document.getElementById('in-tol').value = 0.15;
  document.getElementById('in-wd').value = 300;
  document.getElementById('in-hd').value = 0.5;
  S.camMode = 'auto';
  S.budget = 'entry';
`);
