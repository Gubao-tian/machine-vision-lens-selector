const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = {};
vm.createContext(ctx);
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'lens-data.js'), 'utf8');
const { ENGINE, LENSES, CAMERAS } = vm.runInContext(
  code + '\n;({ ENGINE, LENSES, CAMERAS })', ctx
);

function scenario(name, fovW, fovH, tol, wd, heightDiff, measure) {
  console.log('\n=== ' + name + ' ===');
  console.log(`FOV ${fovW}x${fovH}mm  精度 ${tol * 1000}µm  WD ${wd}mm  hd ${heightDiff}mm`);

  const rec = ENGINE.recommendCameras(fovW, fovH, tol, { moving: false, budget: 'any' });
  console.log(`所需像素 ${rec.need.pxW}x${rec.need.pxH} (${rec.need.mp.toFixed(1)}MP), 像素分辨率 ${(rec.need.pxResUm).toFixed(1)}µm/px`);
  rec.list.forEach(c => {
    console.log(`  ${c.cam.id.padEnd(8)} ${c.fails.length ? 'FAIL: ' + c.fails[0] : 'score ' + c.score + '  margin ' + c.margin.toFixed(2) + 'x'}`);
  });

  const ok = rec.list.filter(c => !c.fails.length);
  if (!ok.length) { console.log('  -> 无可用相机'); return; }

  const c = ok[0].cam;
  const cam = ENGINE.camera(c.w, c.h, c.px, c.fmt, c.mount);
  const target = ENGINE.target(fovW, fovH, cam);
  const mReq = target.m;
  const fTarget = wd * mReq / (1 + mReq);
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
      fails.forEach(f => {
        const k = f.split('（')[0];
        failReasons[k] = (failReasons[k] || 0) + 1;
      });
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
  const res = ENGINE.resolution(fovW, cam);
  console.log(`系统精度 ${(res.minFeature3 * 1000).toFixed(0)}µm, 余量 ${(1 / (res.minFeature3 / tol)).toFixed(2)}x`);
}

scenario('默认工况', 80, 60, 0.12, 300, 1, true);
scenario('小视场高精度(远心区)', 8, 6, 0.008, 100, 2, true);
scenario('大视场中等精度', 300, 225, 0.5, 600, 3, false);
scenario('超高清需求', 500, 400, 0.02, 800, 1, true);
scenario('短工作距离', 20, 15, 0.02, 60, 0.5, true);
