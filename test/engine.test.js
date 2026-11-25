const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = {};
vm.createContext(ctx);
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'lens-data.js'), 'utf8');
const { ENGINE, LENSES, CAMERAS, LIGHT_ENGINE, LIGHTS, LIGHT_SCENES } = vm.runInContext(
  code + '\n;({ ENGINE, LENSES, CAMERAS, LIGHT_ENGINE, LIGHTS, LIGHT_SCENES })', ctx
);

/* 展示上限配置：常量未定义时安全降级为 null，保证 RED 阶段干净失败 */
const DISPLAY_CAPS = vm.runInContext('typeof DISPLAY_CAPS !== "undefined" ? DISPLAY_CAPS : null', ctx);

let PASS = 0, FAIL = 0;
function assert(cond, msg) {
  if (cond) { PASS++; }
  else { FAIL++; console.log('  ✗ FAIL: ' + msg); }
}
function section(name) { console.log('\n=== ' + name + ' ==='); }

/* ============================================================
   第零部分：真实品牌型号数据完整性
   ============================================================ */
section('型号库 · 真实品牌与覆盖');
assert(CAMERAS.length >= 9, `相机型号数 ${CAMERAS.length} ≥ 9`);
CAMERAS.forEach(c => {
  assert(!!c.brand && !!c.model, `${c.id} 有品牌与型号`);
  /* 真实型号可含空格（POL 偏振后缀）与斜杠（C/M 彩黑标识） */
  assert(/^[A-Za-z0-9\-\/ ]+$/.test(c.model), `${c.model} 型号格式合法`);
});
LENSES.forEach(l => assert(/^[A-Za-z0-9\-]+$/.test(l.model), `${l.model} 镜头型号格式合法`));
LIGHTS.forEach(l => assert(/^[A-Za-z0-9\-]+$/.test(l.model), `${l.model} 光源型号格式合法`));
const camBrands = new Set(CAMERAS.map(c => c.brand));
const lensBrands = new Set(LENSES.map(l => l.brand));
const lightBrands = new Set(LIGHTS.map(l => l.brand));
assert(camBrands.has('CST康视达'), '相机库含 CST康视达');
assert(lensBrands.has('CST康视达'), '镜头库含 CST康视达');
assert(lightBrands.has('CST康视达'), '光源库含 CST康视达');
assert(camBrands.has('海康威视'), '相机库含海康威视');
assert(lensBrands.has('海康威视') && lensBrands.has('长步道'), '镜头库含海康威视与长步道');

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
assert(Object.keys(LIGHT_SCENES).length >= 5, `场景规则 ≥5 类（现 ${Object.keys(LIGHT_SCENES).length}）`);
assert(['metal-scratch', 'curve-reflect', 'print-label', 'glass-transparent', 'general']
  .every(k => !!LIGHT_SCENES[k]), '原有 5 类场景均保留');

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
  assert(r.lights.length <= 8, '推荐数不超过 8 款');
}

/* ============================================================
   第三部分：长焦覆盖与零结果反推（新功能）
   ============================================================ */
section('长焦镜头覆盖 · 75mm / 100mm');
const faFocals = [...new Set(LENSES.filter(l => l.type === 'fa').map(l => l.f))].sort((a, b) => a - b);
console.log('FA 焦距档位:', faFocals.join(', '));
assert(faFocals.includes(75), `FA 档位含 75mm（现 ${faFocals.join(',')}）`);
assert(faFocals.some(f => f >= 100), `FA 档位含 ≥100mm（现 ${faFocals.join(',')}）`);
const longLenses = LENSES.filter(l => l.type === 'fa' && l.f >= 75);
assert(longLenses.some(l => l.mp >= 5), '长焦档至少有 5MP 型号，可配主流 5MP 相机');
assert(longLenses.some(l => l.mod <= 0.3), '长焦档至少有 MOD ≤ 0.3m 型号，适配 400mm 级工作距离');
longLenses.forEach(l => assert(/^[A-Za-z0-9\-]+$/.test(l.model), `${l.model} 长焦型号格式合法`));

section('零结果工况 · 截图 FOV50x30 / 0.12mm / WD400');
{
  const fovW = 50, fovH = 30, tol = 0.12, wd = 400, heightDiff = 1;
  /* 截图实际选用 2448×2048 的 2/3" 相机（50/2448=20.4µm/px，倍率 0.236×） */
  const c = CAMERAS.find(x => x.id === 'cam-5');
  assert(!!c, '截图工况相机 cam-5 存在');
  if (c) {
    const cam = ENGINE.camera(c.w, c.h, c.px, c.fmt, c.mount);
    const mReq = ENGINE.target(fovW, fovH, cam).m;
    const ctx = {
      cam, targetM: mReq, fovW, fovH, wd, tol, heightDiff,
      budget: 'any', teleMode: 'off', fnum: 4, moving: false
    };
    const passed = LENSES.filter(l => ENGINE.filter(l, ctx).length === 0);
    console.log(`目标倍率 ${mReq.toFixed(3)}，通过镜头: ${passed.map(l => l.model + '(' + l.f + 'mm)').join(', ') || '无'}`);
    assert(passed.length > 0, `截图工况不再零结果（现 ${passed.length} 款）`);
    assert(passed.some(l => l.f >= 70), '可用镜头含 75mm 长焦档');
  }
}

section('ENGINE.suggestWD · 焦距超范围自动反推工作距离');
{
  const r = ENGINE.suggestWD({ fTarget: 130, targetM: 0.13, wd: 1000 });
  assert(typeof r === 'object' && r !== null, 'suggestWD 返回对象');
  assert(Array.isArray(r.suggestions), 'suggestions 为数组');
  assert(r.overRange === true, '目标焦距 130mm 超库内最长焦距时标记 overRange');
  assert(r.suggestions.length > 0, '超范围时给出至少一条可行建议');
  const s = r.suggestions[0];
  assert(s.lens && s.lens.f >= 75, '首选建议用库内长焦镜头');
  assert(s.f === 100, '首选推荐改动最小的 100mm 档（而非 75mm）');
  assert(s.wd >= s.lens.mod * 1000, '建议工作距离满足镜头最近物距');
  const cam = ENGINE.camera(2448, 2048, 3.45, '2/3"', 'C');
  const m = ENGINE.lensGeometry(s.lens, s.wd, cam).m;
  console.log(`建议 ${s.lens.model}: WD ${s.wd.toFixed(0)}mm → 倍率 ${m.toFixed(3)}（目标 0.130）`);
  assert(Math.abs(m - 0.13) < 0.02, '建议 WD 下倍率接近目标');
  assert(typeof r.message === 'string' && r.message.length > 10, '返回可直接展示的中文建议文案');
}
{
  const r = ENGINE.suggestWD({ fTarget: 40, targetM: 0.2, wd: 240 });
  assert(r.overRange === false, '目标焦距在库内范围时不标记超范围');
}

/* ============================================================
   第四部分：大像圈镜头（1.1" 相机 / 截图 FOV80x68 / WD635）
   ============================================================ */
section('大像圈镜头 · 覆盖 1.1" 靶面（φ17.5mm）');
{
  /* 截图工况：1.1" 12MP 相机对角 φ17.5mm，库内原最大像圈 φ16mm → 全军覆没 */
  const c11 = CAMERAS.find(x => x.id === 'cam-12'); // CST-CG123-31UMD 1.1"
  assert(!!c11, '1.1" 相机 cam-12 存在');
  const cam11 = ENGINE.camera(c11.w, c11.h, c11.px, c11.fmt, c11.mount);
  console.log(`1.1" 相机对角 φ${cam11.diag.toFixed(2)}mm`);
  assert(Math.abs(cam11.diag - 17.5) < 0.5, `相机对角约 17.5mm（现 ${cam11.diag.toFixed(2)}）`);

  /* 库里必须存在像圈 ≥17.6mm 的真实镜头（Kowa LM-FC24M 系列 1.1"） */
  const bigIC = LENSES.filter(l => l.ic >= 17.6);
  console.log(`像圈 ≥17.6mm 镜头: ${bigIC.map(l => l.model + '(φ' + l.ic + ')').join(', ') || '无'}`);
  assert(bigIC.length >= 2, `存在至少 2 款 1.1" 大像圈镜头（现 ${bigIC.length} 款）`);
  assert(bigIC.some(l => l.f >= 75), '大像圈镜头含 75mm 档');
  assert(bigIC.some(l => l.f >= 100), '大像圈镜头含 100mm 档');
  assert(bigIC.every(l => l.mp >= 20), '大像圈镜头解析力 ≥20MP，适配 12MP 相机');
  assert(bigIC.every(l => l.mount === 'C'), '大像圈镜头为 C 口，与相机匹配');
  const kowa = LENSES.filter(l => l.brand === 'Kowa');
  assert(kowa.length >= 3, `镜头库含 Kowa FC24M 系列 ≥3 款（现 ${kowa.length}）`);

  /* 截图工况复现：FOV 80×68 精度 0.12 WD 635，指定 1.1" 相机 */
  const fovW = 80, fovH = 68, tol = 0.12, wd = 635, heightDiff = 1;
  const mReq = ENGINE.target(fovW, fovH, cam11).m;
  const fNeed = wd * mReq / (1 + mReq);
  console.log(`截图工况: 倍率 ${mReq.toFixed(3)}×  所需焦距 ${fNeed.toFixed(1)}mm`);
  const ctx = {
    cam: cam11, targetM: mReq, fovW, fovH, wd, tol, heightDiff,
    budget: 'any', teleMode: 'off', fnum: 4, moving: true
  };
  const coverage = LENSES.filter(l => l.ic >= cam11.diag * 0.97);
  console.log(`像圈可覆盖 1.1" 相机的镜头: ${coverage.map(l => l.model).join(', ') || '无'}`);
  assert(coverage.length >= 2, `至少 2 款镜头像圈覆盖 1.1" 相机（现 ${coverage.length}）`);
  const passed = LENSES.filter(l => ENGINE.filter(l, ctx).length === 0);
  console.log(`硬性约束后通过: ${passed.map(l => l.model + '(' + l.f + 'mm)').join(', ') || '无'}`);
  assert(passed.length > 0, `截图工况不再零结果（现 ${passed.length} 款）`);
  assert(passed.some(l => l.ic >= 17.6), '通过的镜头含 1.1" 大像圈型号');
}

/* ============================================================
   第五部分：工业产线主流品牌与类型扩充
   ============================================================ */
section('产线主流品牌 · 相机/镜头/光源扩充');
{
  /* 相机：产线主流品牌至少 5 家（CST/海康/Basler/大恒/迈德威视） */
  const mustCamBrands = ['CST康视达', '海康威视', 'Basler', '大恒图像', '迈德威视'];
  mustCamBrands.forEach(b => {
    assert(camBrands.has(b), `相机库含产线主流品牌「${b}」`);
  });
  /* 新品牌相机参数完整且可参与推荐 */
  const newCams = CAMERAS.filter(c => ['Basler', '大恒图像', '迈德威视'].includes(c.brand));
  assert(newCams.length >= 4, `新增主流品牌相机 ≥4 款（现 ${newCams.length}）`);
  newCams.forEach(c => {
    assert(!!c.model && c.w > 0 && c.h > 0 && c.px > 0 && c.fmt && !!c.shutter,
      `${c.brand} ${c.model} 参数完整`);
    assert(!!c.tier && !!c.iface, `${c.brand} ${c.model} 含价格档与接口`);
  });
  /* 广域像素工况下，新品牌相机能进入推荐列表 */
  const rec = ENGINE.recommendCameras(120, 90, 0.15, { moving: true, budget: 'any' });
  const recModels = rec.list.map(x => x.cam.brand);
  assert(recModels.includes('Basler') && recModels.includes('大恒图像'),
    '推荐列表覆盖 Basler 与大恒图像');

  /* 镜头：Computar MPW2 超低畸变系列（2/3" 5MP 产线精密检测常用） */
  const mpw2 = LENSES.filter(l => l.brand === 'Computar' && /MPW2/.test(l.model));
  assert(mpw2.length >= 5, `Computar MPW2 超低畸变系列 ≥5 款（现 ${mpw2.length}）`);
  assert(mpw2.every(l => l.mount === 'C' && l.ic >= 11), 'MPW2 均为 C 口 2/3" 像圈');
  assert(mpw2.every(l => ['极低', '低'].includes(l.dist)), 'MPW2 畸变等级为极低/低');
  assert([8, 12, 16, 25, 50].every(f => mpw2.some(l => l.f === f)),
    'MPW2 覆盖 8/12/16/25/50mm 常用焦距档');

  /* 光源：产线主流品牌至少 3 家（CST/奥普特/CCS） */
  const mustLightBrands = ['CST康视达', '奥普特', 'CCS'];
  mustLightBrands.forEach(b => {
    assert(lightBrands.has(b), `光源库含产线主流品牌「${b}」`);
  });
  const ccs = LIGHTS.filter(l => l.brand === 'CCS');
  assert(ccs.length >= 3, `光源库含 CCS ≥3 款（现 ${ccs.length}）`);
  ccs.forEach(l => {
    assert(!!l.model && l.size > 0 && !!l.form && !!l.method && !!l.color,
      `CCS ${l.model} 参数完整`);
  });
  /* CCS 覆盖平面无影/同轴/环形三类产线高价值形态 */
  const ccsForms = new Set(ccs.map(l => l.form));
  assert(ccsForms.has('dome'), 'CCS 含平面无影(穹顶)光源');
  assert(ccsForms.has('coax'), 'CCS 含同轴光源');
  assert(ccsForms.has('ring-high'), 'CCS 含环形光源');
}

/* ============================================================
   第六部分：界面展示上限放宽（让新入库品牌真正露出）
   ============================================================ */
section('展示上限 · 新品牌进入推荐列表');
assert(DISPLAY_CAPS !== null && typeof DISPLAY_CAPS === 'object', '导出展示上限配置 DISPLAY_CAPS');
assert(DISPLAY_CAPS && DISPLAY_CAPS.cameras >= 5,
  `相机展示上限 ≥5（现 ${DISPLAY_CAPS ? DISPLAY_CAPS.cameras : '未定义'}）`);
assert(DISPLAY_CAPS && DISPLAY_CAPS.lenses >= 8,
  `镜头展示上限 ≥8（现 ${DISPLAY_CAPS ? DISPLAY_CAPS.lenses : '未定义'}）`);
assert(DISPLAY_CAPS && DISPLAY_CAPS.lights >= 8,
  `光源展示上限 ≥8（现 ${DISPLAY_CAPS ? DISPLAY_CAPS.lights : '未定义'}）`);
{
  /* 放宽后光源应能真正露出 ≥7 款（每类 2 款 × 多类），而非被 6 款截断 */
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'general', target: 'defect', reflect: 'mid' });
  console.log(`通用场景光源露出 ${r.lights.length} 款，含品牌: ${[...new Set(r.lights.map(p => p.light.brand))].join('/')}`);
  assert(r.lights.length >= 7, `光源推荐露出 ≥7 款（现 ${r.lights.length}）`);
  assert(r.lights.length <= (DISPLAY_CAPS ? DISPLAY_CAPS.lights : 8), '光源露出不超过配置上限');
}

/* ============================================================
   第七部分：检测目标与被测物类型扩充（产线常见分类）
   ============================================================ */
section('光源分类 · 产线常见检测目标与被测物类型');
const LT = LIGHT_ENGINE.targets;
const LS = LIGHT_ENGINE.scenes;

/* 新增检测目标：OCR 读码 / 焊点焊接 / 液位灌装 */
['ocr', 'solder', 'level'].forEach(k => {
  assert(!!LT[k], `检测目标新增「${k}」`);
  assert(LT[k] && !!LT[k].label, `检测目标「${k}」含中文标签`);
  assert(LT[k] && !!LT[k].methodFactor && !!LT[k].formFactor,
    `检测目标「${k}」含打光/形态修饰因子`);
});
assert(Object.keys(LT).length >= 7, `检测目标类型数 ≥7（现 ${Object.keys(LT).length}）`);

/* 新增被测物类型：PCB / 塑胶注塑 */
['pcb', 'plastic'].forEach(k => {
  assert(!!LS[k], `被测物类型新增「${k}」`);
  assert(LS[k] && !!LS[k].label && !!LS[k].desc, `被测物「${k}」含标签与描述`);
  assert(LS[k] && LS[k].methods && LS[k].forms && !!LS[k].primary
    && !!LS[k].guide && !!LS[k].install && !!LS[k].colorTip,
    `被测物「${k}」打光规则字段完整`);
  assert(LS[k] && ['bright', 'diffuse', 'dark', 'back'].every(m => typeof LS[k].methods[m] === 'number'),
    `被测物「${k}」四种打光方式均有评分`);
  assert(LS[k] && ['ring-low', 'ring-high', 'bar', 'coax', 'dome', 'spot', 'backlight']
    .every(fo => typeof LS[k].forms[fo] === 'number'),
    `被测物「${k}」七种光源形态均有评分`);
});
assert(Object.keys(LS).length >= 7, `被测物类型数 ≥7（现 ${Object.keys(LS).length}）`);

/* 组合验证：新目标 + 新场景须能出结果 */
{
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'pcb', target: 'ocr', reflect: 'mid' });
  assert(r.lights.length >= 5, `PCB + OCR 组合能出 ≥5 款光源（现 ${r.lights.length}）`);
}
{
  const r = LIGHT_ENGINE.recommend({ ...baseCtx, scene: 'glass-transparent', target: 'level', reflect: 'mid' });
  assert(r.lights.length >= 5, `透明件 + 液位 组合能出 ≥5 款光源（现 ${r.lights.length}）`);
}

/* ============================================================
   第八部分：多相机拼接（大视野 + 严精度时自动算台数）
   ============================================================ */
section('多相机拼接 · suggestStitch');
assert(typeof ENGINE.suggestStitch === 'function', '引擎提供 suggestStitch()');

if (typeof ENGINE.suggestStitch === 'function') {
  /* 契约字段 */
  const s0 = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: 0.3, wd: 800 });
  ['totalFov', 'tolerance', 'single', 'plans', 'best'].forEach(k =>
    assert(k in s0, `拼接结果含字段 ${k}`));
  assert(s0.totalFov.w === 800 && s0.totalFov.h === 600, 'totalFov 保留客户总视野');

  /* 单机可行性：0.5mm 精度下 800×600 单机可解，0.3mm 单机不可解 */
  const sFine = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: 0.5, wd: 1000 });
  const sMid  = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: 0.3, wd: 1000 });
  assert(sFine.single.feasible === true, '800×600 @0.5mm 单机可行');
  assert(sMid.single.feasible === false, '800×600 @0.3mm 单机不可行');
  const maxCamW = Math.max(...CAMERAS.map(c => c.w));
  assert(sMid.single.need.pxW > maxCamW, '0.3mm 单机所需像素超过库内最大相机');

  /* 台数矩阵：各精度下最小可行拼接，与引擎实算对齐 */
  const cases = [
    { tol: 0.5, count: 1,  nx: 1, ny: 1 },
    { tol: 0.3, count: 4,  nx: 2, ny: 2 },
    { tol: 0.2, count: 9,  nx: 3, ny: 3 },
    { tol: 0.1, count: 25, nx: 5, ny: 5 }
  ];
  cases.forEach(c => {
    const r = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: c.tol, wd: 800 });
    assert(r.best && r.best.count === c.count,
      `800×600 @${c.tol}mm 建议 ${c.count} 台（现 ${r.best && r.best.count}）`);
    assert(r.best && r.best.nx === c.nx && r.best.ny === c.ny,
      `@${c.tol}mm 排布 ${c.nx}×${c.ny}`);
    assert(r.best && Math.abs(r.best.eachW * r.best.nx - 800) < 0.01,
      `@${c.tol}mm 每台视野宽 × 台数 = 总视野`);
    assert(r.best && r.best.camRec && r.best.camRec.list.some(c2 => !c2.fails.length),
      `@${c.tol}mm 每台视野能配到实际相机`);
  });

  /* 现实性标记：25 台应判为不现实 */
  const s25 = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: 0.1, wd: 800 });
  assert(s25.best.practical === false, '25 台方案标记 practical=false');
  const s4 = ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: 0.3, wd: 800 });
  assert(s4.best.practical === true, '4 台方案标记 practical=true');

  /* 非对称视野：总视野宽高比影响排布 */
  const sWide = ENGINE.suggestStitch({ fovW: 1000, fovH: 200, tolerance: 0.3, wd: 800 });
  assert(sWide.best.nx > sWide.best.ny, '宽扁视野横向台数多于纵向');

  /* 台数随精度单调不减 */
  const counts = [0.5, 0.4, 0.3, 0.2, 0.1].map(t =>
    ENGINE.suggestStitch({ fovW: 800, fovH: 600, tolerance: t, wd: 800 }).best.count);
  assert(counts.every((v, i) => i === 0 || v >= counts[i - 1]),
    `精度收紧台数单调不减: ${counts.join('→')}`);
}

/* ============================================================
   汇总
   ============================================================ */
console.log('\n' + '='.repeat(50));
console.log(`测试结果: ${PASS} 通过, ${FAIL} 失败`);
if (FAIL > 0) process.exit(1);
