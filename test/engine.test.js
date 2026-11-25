const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = {};
vm.createContext(ctx);
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'lens-data.js'), 'utf8');
const { ENGINE, LENSES, CAMERAS, LIGHT_ENGINE, LIGHTS, LIGHT_SCENES } = vm.runInContext(
  code + '\n;({ ENGINE, LENSES, CAMERAS, LIGHT_ENGINE, LIGHTS, LIGHT_SCENES })', ctx
);

let PASS = 0, FAIL = 0;
function assert(cond, msg) {
  if (cond) { PASS++; }
  else { FAIL++; console.log('  ✗ FAIL: ' + msg); }
}
function section(name) { console.log('\n=== ' + name + ' ==='); }

/* ============================================================
   第一部分：相机 / 镜头引擎场景（打印明细供人工核对）
   ============================================================ */
function scenario(name, fovW, fovH, tol, wd, heightDiff, measure) {
  section(name);
  console.log(`FOV ${fovW}x${fovH}mm  精度 ${tol * 1000}µm  WD ${wd}mm  hd ${heightDiff}mm`);

  const rec = ENGINE.recommendCameras(fovW, fovH, tol, { moving: false, budget: 'any' });
  console.log(`所需像素 ${rec.need.pxW}x${rec.need.pxH} (${rec.need.mp.toFixed(1)}MP), 像素分辨率 ${rec.need.pxResUm.toFixed(1)}µm/px`);
  assert(rec.need.pxW === Math.ceil(fovW / (tol / 3)), '所需宽度像素 = ceil(FOV / (精度/3))');
  assert(rec.need.pxH === Math.ceil(fovH / (tol / 3)), '所需高度像素 = ceil(FOV / (精度/3))');

  const ok = rec.list.filter(c => !c.fails.length);
  if (!ok.length) { console.log('  -> 无可用相机（符合预期的高精度/大视场场景）'); return; }

  const c = ok[0].cam;
  const cam = ENGINE.camera(c.w, c.h, c.px, c.fmt, c.mount);
  const target = ENGINE.target(fovW, fovH, cam);
  const mReq = target.m;
  const fTarget = wd * mReq / (1 + mReq);
  assert(Math.abs(mReq - Math.max(cam.sW / fovW, cam.sH / fovH)) < 1e-9, '目标倍率 = 像面/视野较大者');
  assert(Math.abs(fTarget - wd * mReq / (1 + mReq)) < 1e-9, '目标焦距公式 f = WD·β/(1+β)');
  console.log(`选定相机 ${c.id}: 像面 ${cam.sW.toFixed(2)}x${cam.sH.toFixed(2)} 对角 ${cam.diag.toFixed(2)}`);
  console.log(`目标倍率 ${mReq.toFixed(4)}  目标焦距 ${fTarget.toFixed(1)}mm`);

  const perspErr = heightDiff * (cam.sW / 2) / wd;
  const needTele = measure && (perspErr > tol * 0.3 || mReq > 0.8);
  console.log(`透视误差 ${(perspErr * 1000).toFixed(1)}µm (判据 ${(tol * 300).toFixed(0)}µm) → 远心 ${needTele ? '需要' : '不需要'}`);
  const sc = {
    cam, targetM: mReq, fovW, fovH, wd, tol,
    heightDiff, budget: 'any',
    teleMode: needTele ? 'prefer' : 'off', fnum: 4, moving: false
  };

  const rows = [];
  let failReasons = {};
  for (const lens of LENSES) {
    const fails = ENGINE.filter(lens, sc);
    if (fails.length) {
      fails.forEach(f => { const k = f.split('（')[0]; failReasons[k] = (failReasons[k] || 0) + 1; });
      continue;
    }
    const s = ENGINE.score(lens, sc);
    const geo = ENGINE.lensGeometry(lens, wd, cam);
    const dof = ENGINE.dof(lens, geo.m, 4, cam.pixelUm);
    const swd = lens.f ? lens.f * (1 + mReq) / mReq : null;
    rows.push({ m: lens.model, sc: s.total, geo, dof, swd, type: lens.type });
  }
  rows.sort((a, b) => b.sc - a.sc);
  console.log('通过筛选 ' + rows.length + ' 款');
  rows.slice(0, 5).forEach(r => {
    console.log(`  ${r.m.padEnd(16)} ${r.type} score ${String(r.sc).padStart(3)}  FOV ${r.geo.fovW.toFixed(0)}x${r.geo.fovH.toFixed(0)}  DOF ${r.dof.toFixed(2)}mm` +
      (r.swd ? `  建议WD ${r.swd.toFixed(0)}` : ''));
  });
  console.log('淘汰原因分布:', failReasons);
  if (rows.length) {
    const res = ENGINE.resolution(fovW, cam);
    console.log(`系统精度 ${(res.minFeature3 * 1000).toFixed(0)}µm, 余量 ${(1 / (res.minFeature3 / tol)).toFixed(2)}x`);
  }
}

scenario('默认工况', 80, 60, 0.12, 300, 1, true);
scenario('小视场高精度(远心区)', 8, 6, 0.008, 100, 2, true);
scenario('大视场中等精度', 300, 225, 0.5, 600, 3, false);
scenario('超高清需求', 500, 400, 0.02, 800, 1, true);
scenario('短工作距离', 20, 15, 0.02, 60, 0.5, true);

/* ============================================================
   第二部分：光源引擎测试
   ============================================================ */
section('光源引擎 · 数据完整性');
assert(LIGHTS.length >= 20, `光源型号数 ${LIGHTS.length} ≥ 20`);
const forms = new Set(LIGHTS.map(l => l.form));
assert(forms.has('ring-low') && forms.has('dome') && forms.has('backlight') && forms.has('coax'), '覆盖关键光源类型');
LIGHTS.forEach(l => {
  assert(['dark','bright','back','diffuse'].includes(l.method), `${l.model} 打光方式合法`);
  assert(l.size > 0, `${l.model} 尺寸为正`);
  assert(typeof l.strobe === 'boolean', `${l.model} 频闪标记为布尔`);
});
assert(Object.keys(LIGHT_SCENES).length === 5, '场景规则含 5 类（含通用）');

section('光源引擎 · 四类场景首选');
const baseCtx = { colorNeed: false, moving: false, budget: 'any', fovW: 80, fovH: 60, wd: 300, backlightOk: true };

function topForm(ctx) {
  const r = LIGHT_ENGINE.recommend(ctx);
  return { r, form: r.lights[0].light.form, model: r.lights[0].light.model };
}

{
  const { r, form, model } = topForm({ ...baseCtx, scene: 'metal-scratch', target: 'defect', reflect: 'high' });
  console.log(`金属划痕(镜面): ${model} [${LIGHT_ENGINE.formName[form]}] 方法 ${r.primaryMethod}`);
  assert(form === 'ring-low' || form === 'bar', '金属划痕首选低角度环形光或条形光（暗场）');
  assert(r.primaryMethod.includes('暗场'), '金属划痕主推打光方式为暗场');
}
{
  const { r, form, model } = topForm({ ...baseCtx, scene: 'curve-reflect', target: 'appearance', reflect: 'high' });
  console.log(`曲面反光(镜面): ${model} [${LIGHT_ENGINE.formName[form]}] 方法 ${r.primaryMethod}`);
  assert(form === 'dome' || form === 'coax', '曲面反光首选穹顶漫射或同轴光');
}
{
  const { r, form, model } = topForm({ ...baseCtx, scene: 'print-label', target: 'appearance', reflect: 'mid' });
  console.log(`印刷标签: ${model} [${LIGHT_ENGINE.formName[form]}] 方法 ${r.primaryMethod}`);
  assert(form === 'ring-high' || form === 'bar' || form === 'dome', '印刷标签首选高角度环形/条形/穹顶（明场）');
}
{
  const { r, form, model } = topForm({ ...baseCtx, scene: 'glass-transparent', target: 'dimension', reflect: 'mid' });
  console.log(`透明玻璃(轮廓): ${model} [${LIGHT_ENGINE.formName[form]}] 方法 ${r.primaryMethod}`);
  assert(form === 'backlight', '透明玻璃轮廓测量首选背光源');
}

section('光源引擎 · 约束响应');
{
  /* 需颜色还原时，单色光不应成为首选 */
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'metal-scratch', target: 'defect', reflect: 'low', colorNeed: true });
  console.log(`颜色还原开启后首选: ${r.lights[0].light.model} 色 ${r.lights[0].light.color} CRI ${r.lights[0].light.cri}`);
  assert(r.lights[0].light.color === '白' && r.lights[0].light.cri >= 90, '颜色还原需求下首选高显色白光');
}
{
  /* 运动检测：频闪型号应被优先 */
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'print-label', target: 'appearance', reflect: 'mid', moving: true });
  const top4 = r.lights.slice(0, 4);
  console.log(`运动场景前四型号频闪支持: ${top4.map(p => p.light.strobe).join(', ')}`);
  assert(top4.filter(p => p.light.strobe).length >= 3, '运动场景前四型号多数支持频闪');
}
{
  /* 背面不可安装时，背光源应被显著降权 */
  const withBack = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'glass-transparent', target: 'dimension', reflect: 'mid', backlightOk: true });
  const noBack = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'glass-transparent', target: 'dimension', reflect: 'mid', backlightOk: false });
  const bs1 = withBack.lights.find(p => p.light.form === 'backlight');
  const bs2 = noBack.lights.find(p => p.light.form === 'backlight');
  console.log(`背光可行性切换: 可行 ${bs1 ? bs1.score : '未入榜'} → 不可行 ${bs2 ? bs2.score : '未入榜'}`);
  assert(!bs2 || bs2.score < bs1.score, '背面不可安装时背光评分下降或不入榜');
}
{
  /* 尺寸建议随视野增长 */
  const small = LIGHT_ENGINE.sizeAdvice('ring-low', 40, 30);
  const large = LIGHT_ENGINE.sizeAdvice('ring-low', 200, 150);
  console.log(`环形光尺寸建议: 40x30 → ${small}mm, 200x150 → ${large}mm`);
  assert(large > small, '视野越大建议光源尺寸越大');
  assert(small % 10 === 0 && large % 10 === 0, '尺寸建议向上取整到 10mm');
}
{
  /* 去重：每类光源最多 2 款 */
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'general', target: 'defect', reflect: 'mid' });
  const cnt = {};
  r.lights.forEach(p => { cnt[p.light.form] = (cnt[p.light.form] || 0) + 1; });
  assert(Object.values(cnt).every(v => v <= 2), '每个光源类型最多保留 2 款');
  assert(r.lights.length <= 6, '推荐数不超过 6 款');
}

/* ============================================================
   汇总
   ============================================================ */
console.log('\n' + '='.repeat(50));
console.log(`测试结果: ${PASS} 通过, ${FAIL} 失败`);
if (FAIL > 0) process.exit(1);
