/* ============================================================
   工业镜头选型 — 应用逻辑
   ============================================================ */

const S = {
  fovW: 80, fovH: 60,
  tol: 0.12,
  wd: 300,
  heightDiff: 1,
  measure: true,
  moving: false,
  camMode: 'auto',
  camId: null,
  manual: { w: 2448, h: 2048, px: 3.45, fmt: '2/3"', mount: 'C' },
  budget: 'any',
  teleMode: 'auto',
  fnum: 4,
  stitch: false,
  /* 光源选型输入 */
  lightScene: 'metal-scratch',
  lightTarget: 'defect',
  lightReflect: 'mid',
  lightColorNeed: false,
  lightBackOk: false
};

const $ = (id) => document.getElementById(id);
const num = (id, def) => {
  const v = parseFloat($(id).value);
  return Number.isFinite(v) ? v : def;
};
const fmt = (n, d = 2) => {
  if (!Number.isFinite(n)) return '—';
  if (n !== 0 && Math.abs(n) < 0.01) return n.toExponential(1);
  let s = Math.abs(n) >= 1e5 ? n.toExponential(2) : n.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return (s === '-0' || s === '0' && n < 0) ? '0' : s;
};

let LAST = null;   // 最近一次计算结果，供摘要复用

/* 结果页签：cam / lens / light */
function switchTab(name) {
  document.querySelectorAll('#result-tabs button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('hide', p.dataset.panel !== name);
  });
}
function updateTabCounts(camN, lensN, lightN) {
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('tab-n-cam', camN);
  set('tab-n-lens', lensN);
  set('tab-n-light', lightN);
}

/* ---------------- 输入同步 ---------------- */
function syncFromDOM() {
  S.fovW = num('in-fovw', S.fovW);
  S.fovH = num('in-fovh', S.fovH);
  S.tol = num('in-tol', S.tol);
  S.wd = num('in-wd', S.wd);
  S.heightDiff = num('in-hd', S.heightDiff);
  S.measure = $('in-measure').checked;
  S.moving = $('in-moving').checked;
  S.fnum = num('in-fnum', S.fnum);
  S.stitch = $('in-stitch') ? $('in-stitch').checked : false;
  S.lightScene = $('in-light-scene').value;
  S.lightTarget = $('in-light-target').value;
  S.lightColorNeed = $('in-light-color').checked;
  S.lightBackOk = $('in-light-back').checked;
  if (S.camMode === 'manual') {
    S.manual.w = num('in-camw', 2448);
    S.manual.h = num('in-camh', 2048);
    S.manual.px = num('in-campx', 3.45);
    S.manual.fmt = $('in-camfmt').value;
    S.manual.mount = $('in-cammount').value;
  }
}

/* ---------------- 主计算 ---------------- */
function compute() {
  syncFromDOM();

  const totalFovW = Math.max(S.fovW, 0.1);
  const totalFovH = Math.max(S.fovH, 0.1);
  const tol = Math.max(S.tol, 0.0005);
  const wd = Math.max(S.wd, 5);

  /* 0a. 多相机拼接：开关打开时按客户总视野算台数；单机不可行则改用每台视野做后续推导 */
  let stitchInfo = null;
  let fovW = totalFovW, fovH = totalFovH;
  if (S.stitch) {
    stitchInfo = ENGINE.suggestStitch({ fovW: totalFovW, fovH: totalFovH, tolerance: tol, wd });
    if (!stitchInfo.single.feasible && stitchInfo.best.feasible) {
      fovW = stitchInfo.best.eachW;
      fovH = stitchInfo.best.eachH;
    }
  }

  /* 0. 光源推荐（独立于相机，提前计算） */
  const lightRec = LIGHT_ENGINE.recommend({
    scene: S.lightScene, target: S.lightTarget, reflect: S.lightReflect,
    colorNeed: S.lightColorNeed, backlightOk: S.lightBackOk,
    moving: S.moving, budget: S.budget, fovW, fovH, wd
  });

  /* 1. 正向推导相机需求 */
  const camRec = ENGINE.recommendCameras(fovW, fovH, tol, {
    moving: S.moving, budget: S.budget
  });

  const okCams = camRec.list.filter(c => !c.fails.length);

  /* 2. 确定当前相机 */
  let cam = null;
  let activeCamEntry = null;

  if (S.camMode === 'auto') {
    let pick = okCams.find(c => c.cam.id === S.camId);
    if (!pick) pick = okCams[0];
    if (pick) {
      activeCamEntry = pick;
      cam = ENGINE.camera(pick.cam.w, pick.cam.h, pick.cam.px, pick.cam.fmt, pick.cam.mount);
      S.camId = pick.cam.id;
    }
  } else {
    cam = ENGINE.camera(S.manual.w, S.manual.h, S.manual.px, S.manual.fmt, S.manual.mount);
  }

  if (!cam) {
    return { error: 'no-camera', need: camRec.need, camRec, fovW, fovH, tol, wd, lightRec, stitchInfo, totalFovW, totalFovH };
  }

  /* 3. 目标倍率与焦距 */
  const target = ENGINE.target(fovW, fovH, cam);
  const mReq = target.m;
  const fTarget = wd * mReq / (1 + mReq);

  /* 4. 远心策略
     透视误差估算：高度差引起的横向偏移 ≈ hd × (半像面尺寸 / WD)
     超过要求精度的 30% 时，普通 FA 镜头的透视误差不可忽略 */
  const perspErr = S.heightDiff * (cam.sW / 2) / wd;
  const needTele = S.measure && (perspErr > tol * 0.3 || mReq > 0.8);
  let teleMode = S.teleMode;
  if (teleMode === 'auto') teleMode = needTele ? 'prefer' : 'off';

  const ctx = {
    cam, targetM: mReq, fovW, fovH, wd, tol,
    heightDiff: S.heightDiff, budget: S.budget,
    teleMode, fnum: S.fnum, moving: S.moving
  };

  /* 5. 镜头筛选与评分 */
  const passed = [];
  const failed = [];

  for (const lens of LENSES) {
    const fails = ENGINE.filter(lens, ctx);
    if (fails.length) {
      failed.push({ lens, fails });
      continue;
    }
    const sc = ENGINE.score(lens, ctx);
    const geo = ENGINE.lensGeometry(lens, wd, cam);
    const dof = ENGINE.dof(lens, geo.m, S.fnum, cam.pixelUm);
    const ext = ENGINE.extension(lens, wd, mReq);

    /* 焦距为离散档位，反算精确覆盖视野所需的工作距离 */
    const suggestWD = lens.f ? lens.f * (1 + mReq) / mReq : null;

    let total = sc.total;
    if (teleMode === 'prefer' && lens.type === 'tele') total += 6;
    if (teleMode === 'prefer' && lens.type === 'fa' && needTele) total -= 4;

    /* 远心镜头工作距离固定，倍率不可调：视场不足即无法通过调整弥补 */
    const shortFov = lens.type === 'tele' &&
      (geo.fovW < fovW * 0.98 || geo.fovH < fovH * 0.98);
    if (shortFov) total -= 14;

    passed.push({
      lens, geo, dof, ext, suggestWD, shortFov,
      score: Math.max(0, Math.min(100, total)),
      rawScore: sc.total,
      parts: sc.parts
    });
  }

  passed.sort((a, b) => b.score - a.score);

  /* 焦距档位去重：每档最多 2 款，让推荐覆盖更多焦距选择 */
  const cntByF = {};
  const deduped = [];
  for (const p of passed) {
    const key = p.lens.type === 'tele' ? 'T' + p.lens.mag : 'F' + p.lens.f;
    if ((cntByF[key] || 0) < 2) {
      cntByF[key] = (cntByF[key] || 0) + 1;
      deduped.push(p);
    }
    if (deduped.length >= DISPLAY_CAPS.lenses) break;
  }
  if (deduped.length < DISPLAY_CAPS.lenses) {
    for (const p of passed) {
      if (!deduped.includes(p)) deduped.push(p);
      if (deduped.length >= DISPLAY_CAPS.lenses) break;
    }
  }

  /* 6. 系统指标 */
  const res = ENGINE.resolution(fovW, cam);
  const sysTol = res.minFeature3;
  const tolRatio = sysTol / tol;

  /* 零结果补救：所需焦距超出库内最长焦距时，反推可用的工作距离 */
  const wdSuggest = passed.length
    ? null
    : ENGINE.suggestWD({ fTarget, targetM: mReq, wd });

  return {
    fovW, fovH, tol, wd, cam, camRec, activeCamEntry,
    target, mReq, fTarget,
    passed, failed, shown: deduped,
    res, sysTol, tolRatio,
    dofBest: passed[0] ? passed[0].dof : 0,
    needTele, teleMode, perspErr,
    need: camRec.need,
    lightRec, wdSuggest, stitchInfo, totalFovW, totalFovH
  };
}

/* 拼接方案卡片：开关打开时展示台数矩阵与每台视野 */
function renderStitch(R) {
  const host = $('out-stitch');
  if (!host) return;
  const S2 = R.stitchInfo;
  if (!S2) { host.innerHTML = ''; return; }

  const b = S2.best;
  const single = S2.single;
  const grid = [];
  for (let y = 0; y < b.ny; y++) {
    for (let x = 0; x < b.nx; x++) grid.push('<i></i>');
  }
  const topCam = b.camRec && b.camRec.list.find(c => !c.fails.length);
  const camLabel = topCam ? `${topCam.cam.brand} ${topCam.cam.model}（${topCam.cam.w}×${topCam.cam.h}）` : '每台视野无可用相机';

  let head, note;
  if (single.feasible) {
    head = `<b>单机即可覆盖</b>：${S2.totalFov.w}×${S2.totalFov.h}mm @ ${S2.tolerance}mm，库内最大相机 ${single.maxCam.brand} ${single.maxCam.model} 可满足，无需拼接。`;
    note = '';
  } else {
    const practicalCls = b.practical ? 'ok' : 'warn';
    head = `<b>单机无法覆盖</b>，需 <b>${b.nx}×${b.ny} = ${b.count} 台</b>拼接。每台视野 <b>${fmt(b.eachW, 0)}×${fmt(b.eachH, 0)}mm</b>，推荐 ${camLabel}。`;
    note = b.practical
      ? `<div class="notice ok"><span class="ico">✓</span><div>该台数在常规产线可接受范围（≤9 台），相机页签按<b>每台视野</b>给出型号。每台若用大靶面相机，可能需配大像圈长焦镜头——若镜头页无匹配，可调大 WD 或改用远心/大像圈镜头。</div></div>`
      : `<div class="notice warn"><span class="ico">!</span><div>${b.count} 台拼接装配复杂、标定成本高，工程上通常不可行。建议：放宽精度、缩小单次视野改为运动扫描，或改用线阵相机（超出本工具面阵模型）。</div></div>`;
  }

  host.innerHTML = `
    <div class="stitch-card ${single.feasible ? '' : 'active'}">
      <div class="stitch-head">多相机拼接评估 <span class="stitch-badge">${S2.totalFov.w}×${S2.totalFov.h}mm</span></div>
      <div class="stitch-body">${head}</div>
      ${single.feasible ? '' : `
      <div class="stitch-grid" style="grid-template-columns: repeat(${b.nx}, 1fr)">
        ${grid.join('')}
      </div>
      <div class="stitch-meta">
        <span>单机所需 ${single.need.pxW}×${single.need.pxH}px</span>
        <span>库内最大 ${single.maxCam.w}×${single.maxCam.h}px</span>
        <span>每台 ${fmt(b.eachW, 0)}×${fmt(b.eachH, 0)}mm</span>
      </div>
      ${note}`}
    </div>`;
}

/* ---------------- 渲染 ---------------- */
function render() {
  const R = compute();
  LAST = R;
  renderStitch(R);
  const outLenses = $('out-lenses');
  const outCams = $('out-cams');
  const outMetrics = $('out-metrics');
  const outLights = $('out-lights');
  const outRisks = $('out-risks');
  const outDetail = $('out-detail-body');

  /* ── 无可用相机 ── */
  if (R.error === 'no-camera') {
    updateTabCounts(0, 0, R.lightRec ? R.lightRec.lights.length : 0);
    outMetrics.innerHTML = '';
    outCams.innerHTML = `
      <div class="notice bad"><span class="ico">!</span>
        <div><b>内置相机库无法覆盖该需求</b><br>
        需要约 ${R.need.pxW} × ${R.need.pxH} 像素（${fmt(R.need.mp, 1)} MP），
        超出示例库最大档位。请降低精度要求、缩小视野，或采用多相机/扫描拼接方案。</div>
      </div>`;
    outLenses.innerHTML = `<div class="empty">无可用相机，无法匹配镜头。</div>`;
    renderLights(R);
    outRisks.innerHTML = '';
    outDetail.innerHTML = '';
    updateBottom(null);
    return;
  }

  /* ── 指标条 ── */
  const cam = R.cam;
  const tolCls = R.tolRatio <= 1 ? 'good' : R.tolRatio <= 1.25 ? 'warn' : 'bad';

  outMetrics.innerHTML = `
    <div class="metric">
      <div class="k">所需焦距</div>
      <div class="v">${fmt(R.fTarget, 1)}<small>mm</small></div>
    </div>
    <div class="metric">
      <div class="k">光学放大倍率</div>
      <div class="v">${fmt(R.mReq, 3)}<small>×</small></div>
    </div>
    <div class="metric">
      <div class="k">像素分辨率</div>
      <div class="v">${fmt(R.res.pxResUm, 1)}<small>µm/px</small></div>
    </div>
    <div class="metric ${tolCls}">
      <div class="k">系统可达精度</div>
      <div class="v">${fmt(R.sysTol * 1000, 0)}<small>µm</small></div>
    </div>
    <div class="metric">
      <div class="k">估算景深</div>
      <div class="v">${fmt(R.dofBest, R.dofBest < 10 ? 2 : 1)}<small>mm</small></div>
    </div>
    <div class="metric">
      <div class="k">所需相机像素</div>
      <div class="v">${R.need.pxW}<small>×</small>${R.need.pxH}</div>
    </div>`;

  /* ── 相机推荐 ── */
  const topCams = R.camRec.list.filter(c => !c.fails.length).slice(0, DISPLAY_CAPS.cameras);
  if (S.camMode === 'auto') {
    outCams.innerHTML = topCams.map((c, i) => {
      const active = R.activeCamEntry && c.cam.id === R.activeCamEntry.cam.id;
      return `
      <div class="lens-card ${i === 0 ? 'top' : ''}" data-cam="${c.cam.id}"
           style="cursor:pointer;${active ? 'outline:2px solid var(--accent-2);outline-offset:-1px' : ''}">
        <div class="rank">${i + 1}<span class="sc">SCORE</span></div>
        <div class="card-body">
          <div class="card-head">
            <div class="card-title">
              <span class="model">${c.cam.brand} ${c.cam.model}</span>
              <div class="brandline">
                <span class="badge">${fmt(c.cam.mp, 1)}MP · ${c.cam.fmt} · ${c.cam.w}×${c.cam.h}</span>
                <span class="badge gray">${c.cam.px}µm · ${c.cam.sensor}</span>
                <span class="badge ${c.cam.shutter === '全局' ? 'green' : 'amber'}">${c.cam.shutter}快门</span>
                <span class="badge gray">${c.cam.iface}</span>
                <span class="badge gray">${c.cam.mount} 口</span>
                ${active ? '<span class="badge">已选用</span>' : ''}
              </div>
            </div>
            <div class="score-ring" style="--p:${c.score}%"><span>${c.score}<small></small></span></div>
          </div>
          <div class="specs">
            <div><span class="sk">可达精度</span><span class="sv">${fmt(c.achievable * 1000, 0)} µm</span></div>
            <div><span class="sk">像素余量</span><span class="sv">${fmt(c.margin, 2)}×</span></div>
            <div><span class="sk">像面尺寸</span><span class="sv">${fmt(c.cam.w * c.cam.px / 1000, 1)}×${fmt(c.cam.h * c.cam.px / 1000, 1)}</span></div>
            <div><span class="sk">价格档位</span><span class="sv">${{ entry: '经济', mid: '主流', high: '高端' }[c.cam.tier]}</span></div>
          </div>
          <p class="reason">${camReason(c)}</p>
        </div>
      </div>`;
    }).join('');
  } else {
    outCams.innerHTML = `
      <div class="lens-card">
        <div class="rank">—</div>
        <div class="card-body">
          <div class="card-head">
            <div class="card-title">
              <span class="model">${cam.pxW}×${cam.pxH} · ${cam.fmt} · ${cam.pixelUm}µm</span>
              <div class="brandline">
                <span class="badge">手动指定</span>
                <span class="badge gray">${cam.mount} 口</span>
                <span class="badge gray">${fmt(cam.mp, 1)} MP</span>
              </div>
            </div>
          </div>
          <div class="specs">
            <div><span class="sk">像面尺寸</span><span class="sv">${fmt(cam.sW, 1)}×${fmt(cam.sH, 1)}</span></div>
            <div><span class="sk">像圈需求</span><span class="sv">φ${fmt(cam.diag, 1)}</span></div>
            <div><span class="sk">可达精度</span><span class="sv">${fmt(R.sysTol * 1000, 0)} µm</span></div>
            <div><span class="sk">精度余量</span><span class="sv ${R.tolRatio > 1.25 ? 'miss' : ''}">${fmt(1 / R.tolRatio, 2)}×</span></div>
          </div>
        </div>
      </div>`;
  }

  updateTabCounts(
    S.camMode === 'auto' ? topCams.length : 1,
    R.passed.length,
    R.lightRec ? R.lightRec.lights.length : 0
  );
  const cnt = $('out-cam-count');
  if (cnt) {
    cnt.textContent = S.camMode === 'auto'
      ? `${topCams.length} 档可选 · 点击卡片切换相机后自动查看匹配镜头`
      : '手动指定参数';
  }
  const lcnt = $('out-lens-count');
  if (lcnt) {
    lcnt.textContent = R.passed.length
      ? `${R.passed.length} 款通过硬性约束 · 按匹配度排序`
      : '';
  }

  /* ── 镜头推荐 ── */
  if (!R.passed.length) {
    const diag = analyzeFailure(R.failed, R);
    const ws = R.wdSuggest;
    const rescueHtml = ws && ws.overRange && ws.suggestions.length
      ? `<div class="notice ok rescue"><span class="ico">✓</span>
          <div><b>可落地的补救方案</b><br>${ws.message}
          <div class="rescue-acts">
            ${ws.suggestions.map((s, i) => `
              <button type="button" class="btn-apply-wd" data-wd="${s.wd}"
                title="点击后自动填入工作距离并重新计算">
                应用 WD ${s.wd}mm · ${s.lens.model}
              </button>`).join('')}
          </div></div>
        </div>`
      : ws && ws.overRange
        ? `<div class="notice warn"><span class="ico">!</span><div>${ws.message}</div></div>`
        : '';
    outLenses.innerHTML = `
      <div class="notice bad"><span class="ico">!</span>
        <div><b>当前条件下没有匹配的镜头</b><br>
        所需焦距 ${fmt(R.fTarget, 1)}mm、倍率 ${fmt(R.mReq, 3)}×，
        ${LENSES.length} 款候选全部被硬性约束排除。
        ${R.teleMode === 'only' ? '可先尝试放开「仅远心」限制。' : ''}</div>
      </div>` +
      rescueHtml +
      diag.map(([cls, title, body]) => `
        <div class="notice ${cls}"><span class="ico">${cls === 'info' ? 'i' : '!'}</span>
          <div><b>${title}</b><br>${body}</div></div>`).join('');
  } else {
    outLenses.innerHTML = R.shown.map((p, i) => lensCard(p, i)).join('');
  }

  /* ── 光源推荐 ── */
  renderLights(R);

  /* ── 风险提示 ── */
  outRisks.innerHTML = buildRisks(R);

  /* ── 计算明细 ── */
  outDetail.innerHTML = buildDetail(R);

  updateBottom(R);
  bindCamPick();
  bindWdApply();
}

function camReason(c) {
  const bits = [];
  if (c.coverCount !== undefined) {
    if (c.coverCount >= 6) bits.push(`内置库 <b>${c.coverCount}</b> 款镜头可覆盖该靶面`);
    else if (c.coverCount >= 2) bits.push(`仅 <b>${c.coverCount}</b> 款镜头覆盖该靶面，可选面偏窄`);
    else bits.push(`<b>内置库无镜头覆盖该靶面</b>，需另配大靶面镜头系列`);
  }
  if (c.margin >= 1.15 && c.margin <= 2.0) bits.push(`像素余量 <b>${fmt(c.margin, 2)}×</b>，选型余量合理`);
  else if (c.margin < 1.15) bits.push(`像素余量仅 <b>${fmt(c.margin, 2)}×</b>，接近极限，建议复核精度定义`);
  else bits.push(`像素余量 <b>${fmt(c.margin, 2)}×</b>，存在过度选型，成本与带宽偏高`);

  if (c.cam.shutter === '卷帘' && S.moving) bits.push('被测物运动 + 卷帘快门存在拖影风险');
  if (c.cam.px < 2.4) bits.push('像元较小，需提高照明强度以控制信噪比');
  bits.push(`该规格可达精度 <b>${fmt(c.achievable * 1000, 0)} µm</b>`);
  return bits.join('；') + '。';
}

function lensCard(p, i) {
  const l = p.lens;
  const isTele = l.type === 'tele';
  const sc = Math.round(p.score);

  const fCell = isTele
    ? `<div><span class="sk">放大倍率</span><span class="sv">${l.mag}×</span></div>`
    : `<div><span class="sk">焦距</span><span class="sv">${l.f} mm</span></div>`;

  const mCell = isTele
    ? `<div><span class="sk">工作距离</span><span class="sv">${l.wd} mm 固定</span></div>`
    : `<div><span class="sk">最近物距</span><span class="sv">${fmt(l.mod * 1000, 0)} mm</span></div>`;

  const aoCell = isTele
    ? `<div><span class="sk">标称景深</span><span class="sv">±${l.dof} mm</span></div>`
    : `<div><span class="sk">最大光圈</span><span class="sv">F${l.fn}</span></div>`;

  const reasons = [];
  if (!isTele) {
    const dev = p.geo.m - LAST.mReq;
    if (Math.abs(dev / LAST.mReq) < 0.06) reasons.push(`焦距 <b>${l.f}mm</b> 与需求 ${fmt(LAST.fTarget, 1)}mm 高度吻合`);
    else reasons.push(`实际视场 <b>${fmt(p.geo.fovW, 0)}×${fmt(p.geo.fovH, 0)}mm</b>（需求 ${fmt(LAST.fovW, 0)}×${fmt(LAST.fovH, 0)}）`);
  } else {
    reasons.push(`固定倍率 <b>${l.mag}×</b> 对应视场 <b>${fmt(p.geo.fovW, 0)}×${fmt(p.geo.fovH, 0)}mm</b>，无透视误差`);
  }
  reasons.push(`像圈 φ${l.ic}mm 覆盖相机 φ${fmt(LAST.cam.diag, 1)}mm`);
  reasons.push(`估算景深 ${fmt(p.dof, p.dof < 10 ? 2 : 1)}mm`);
  if (!isTele && p.suggestWD && Math.abs(p.suggestWD - S.wd) / S.wd > 0.03) {
    reasons.push(`将 WD 调至 <b>${fmt(p.suggestWD, 0)}mm</b> 可精确覆盖视野（当前 ${fmt(S.wd, 0)}mm）`);
  }
  if (p.ext) reasons.push(`或加 <b>≈${fmt(p.ext, 1)}mm</b> 接圈补偿倍率`);
  if (isTele) reasons.push(`安装距离须按 <b>${l.wd}mm</b> 固定设计`);

  return `
  <article class="lens-card ${i === 0 ? 'top' : ''}">
    <div class="rank">${i + 1}<span class="sc">SCORE</span></div>
    <div class="card-body">
      <div class="card-head">
        <div class="card-title">
          <span class="model">${l.brand} ${l.model}</span>
          <div class="brandline">
            <span class="badge ${isTele ? 'green' : ''}">${isTele ? '物方远心' : 'FA 定焦'}</span>
            <span class="badge gray">${l.series}</span>
            <span class="badge gray">${l.fmt} · φ${l.ic}</span>
            <span class="badge gray">${l.mount} 口</span>
            <span class="badge gray">${l.mp}MP</span>
            <span class="badge gray">${l.dist}畸变</span>
            <span class="badge ${l.tier === 'entry' ? 'green' : l.tier === 'high' ? 'amber' : 'gray'}">${{ entry: '经济', mid: '主流', high: '高端' }[l.tier]}</span>
            ${l.mp < LAST.cam.mp * 0.95
              ? `<span class="badge amber">解析力受限 ${l.mp}/${fmt(LAST.cam.mp, 1)}MP</span>`
              : ''}
            ${p.shortFov
              ? `<span class="badge" style="background:#fdeceb;color:#a8271f">视场不足 ${fmt((1 - Math.min(p.geo.fovW / LAST.fovW, p.geo.fovH / LAST.fovH)) * 100, 0)}%</span>`
              : ''}
            ${!isTele && p.suggestWD && Math.abs(p.suggestWD - S.wd) / S.wd > 0.03
              ? `<span class="badge amber">建议 WD ${fmt(p.suggestWD, 0)}mm</span>`
              : ''}
          </div>
        </div>
        <div class="score-ring" style="--p:${sc}%"><span>${sc}</span></div>
      </div>
      <div class="specs">
        ${fCell}
        ${mCell}
        ${aoCell}
        <div><span class="sk">当前视场</span><span class="sv ${p.shortFov ? 'miss' : ''}">${fmt(p.geo.fovW, 0)}×${fmt(p.geo.fovH, 0)}</span></div>
      </div>
      <p class="reason">${reasons.join('；')}。</p>
    </div>
  </article>`;
}

/* ---------------- 光源推荐渲染 ---------------- */
function renderLights(R) {
  const LR = R.lightRec;
  const host = $('out-lights');
  const cnt = $('out-light-count');
  if (!LR) { host.innerHTML = ''; return; }

  const scene = LR.scene;
  cnt.textContent = `${LIGHT_ENGINE.formName[LR.lights[0]?.light.form] || '—'} 优先 · ${LR.lights.length} 款可选`;

  /* 结论条：打光方式 + 布光说明 */
  const head = `
    <div class="light-brief">
      <div class="light-brief-top">
        <span class="badge">${scene.label}</span>
        <span class="badge gray">检测目标：${LR.target.label}</span>
        <span class="badge green">${LR.primaryMethod}</span>
      </div>
      <p>${scene.guide}</p>
      <div class="light-tips">
        <div><span class="tip-k">安装要点</span><span class="tip-v">${scene.install}</span></div>
        <div><span class="tip-k">颜色建议</span><span class="tip-v">${scene.colorTip}</span></div>
      </div>
    </div>`;

  const cards = LR.lights.map((p, i) => {
    const l = p.light;
    const sc = p.score;
    const colorBadge = l.color === '白'
      ? `<span class="badge gray">白光${l.cri ? ' · CRI' + l.cri : ''}</span>`
      : `<span class="badge amber">${l.color}光</span>`;
    const sizeWarn = !p.sizeOk
      ? `<span class="badge amber">建议 ≥${p.needSize}mm</span>`
      : '';

    const reasons = [];
    reasons.push(`打光方式 <b>${LIGHT_METHOD_NAME[l.method]}</b>`);
    reasons.push(`发光面建议 <b>≥${p.needSize}mm</b>（型号标称 ${l.size}mm）`);
    if (l.angle) reasons.push(`照射角度 ${l.angle}`);
    if (l.strobe) reasons.push('支持频闪');
    if (l.color === '白' && l.cri) reasons.push(`显色指数 CRI ${l.cri}`);
    const installWarn = p.installNotes.length
      ? `<p class="reason warnline">${p.installNotes.join('；')}</p>` : '';

    return `
    <article class="light-card ${i === 0 ? 'top' : ''}">
      <div class="light-ico" data-form="${l.form}">${lightGlyph(l.form)}</div>
      <div class="light-body">
        <div class="card-head">
          <div class="card-title">
            <span class="model">${l.brand} ${l.model}</span>
            <div class="brandline">
              <span class="badge ${i === 0 ? '' : 'gray'}">${LIGHT_FORM_NAME[l.form]}</span>
              ${colorBadge}
              ${sizeWarn}
              <span class="badge ${l.tier === 'entry' ? 'green' : l.tier === 'high' ? 'amber' : 'gray'}">${{ entry: '经济', mid: '主流', high: '高端' }[l.tier]}</span>
            </div>
          </div>
          <div class="score-ring" style="--p:${sc}%"><span>${sc}</span></div>
        </div>
        <p class="reason">${reasons.join('；')}。<br><span class="note-dim">${l.note}</span></p>
        ${installWarn}
      </div>
    </article>`;
  }).join('');

  host.innerHTML = head + `<div class="light-list">${cards}</div>`;
}

/* 光源类型示意符号（SVG 图形，避免依赖图标库） */
function lightGlyph(form) {
  const g = {
    'ring-low': '<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 3"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="2"/>',
    'ring-high': '<circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="2"/>',
    'bar': '<rect x="5" y="12" width="22" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 4v5M12 6l4 3 4-3" stroke="currentColor" stroke-width="1.8" fill="none"/>',
    'coax': '<path d="M7 16h18M16 6v20" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2"/>',
    'dome': '<path d="M5 20a11 11 0 0 1 22 0" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 20v5" stroke="currentColor" stroke-width="2"/>',
    'backlight': '<rect x="5" y="9" width="22" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M10 13h12M10 19h12" stroke="currentColor" stroke-width="1.6"/>',
    'spot': '<path d="M13 5h6l6 20H7z" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="16" cy="9" r="2" fill="currentColor"/>'
  };
  return `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">${g[form] || g.spot}</svg>`;
}

/* 无匹配镜头时的原因诊断 */
function analyzeFailure(failed, R) {
  const cnt = {};
  failed.forEach(f => f.fails.forEach(s => {
    const k = s.split('（')[0];
    cnt[k] = (cnt[k] || 0) + 1;
  }));
  const total = Math.max(failed.length, 1);
  const share = k => (cnt[k] || 0) / total;
  const out = [];

  if (share('低于最近物距') > 0.30) {
    const mods = LENSES.filter(l => l.mod).map(l => l.mod * 1000);
    out.push(['bad', '工作距离小于镜头最近物距',
      `WD ${fmt(R.wd, 0)}mm 低于库内 FA 镜头的最短合焦距离（约 ${fmt(Math.min(...mods), 0)}mm 起）。
       定焦 FA 镜头无法在过近位置合焦，需增大 WD、改用近摄接圈，或选显微/近摄类镜头。`]);
  }
  if (share('焦距偏差过大') > 0.30) {
    out.push(['warn', '所需焦距落在库内档位间隙',
      `目标焦距 <b>${fmt(R.fTarget, 1)}mm</b> 与现有标准档位偏差超过 35%。
       可反向调整视野或工作距离使需求靠拢标准焦距，或向厂商索取中间焦距样本。`]);
  }
  if (share('像圈不足') > 0.30) {
    const maxIC = Math.max(...LENSES.map(l => l.ic || 0));
    const icFmt = maxIC >= 17.6 ? '1.1"' : maxIC >= 16 ? '1"' : maxIC >= 11 ? '2/3"' : '1/1.8"';
    out.push(['bad', '相机靶面超出镜头库覆盖范围',
      `相机对角 φ${fmt(R.cam.diag, 1)}mm，库内镜头最大像圈为 φ${fmt(maxIC, 1)}mm（${icFmt} 档）。
       该相机靶面超出全部内置镜头的覆盖能力：需选用更大像圈的镜头系列（如 1.1" 大靶面镜头），
       或换用更小靶面（如 2/3"）的相机。`]);
  }
  if (share('解析力差距过大') > 0.25) {
    out.push(['warn', '镜头库解析力跟不上相机',
      `相机 ${fmt(R.cam.mp, 1)}MP 远超库内镜头标称适配像素。需选用 10MP 以上镜头系列，
       否则边缘解析力与畸变表现会明显劣化。`]);
  }
  if ((cnt['倍率偏差过大'] || 0) > 0) {
    out.push(['info', '远心倍率无法覆盖',
      `远心镜头为固定倍率（示例库 1×/2×/4×），无法匹配所需 <b>${fmt(R.mReq, 3)}×</b>。
       远心系列通常按 0.5/0.75/1/1.5/2/3/4/6× 分档，需在完整产品线中取最近档位并据此调整视野。`]);
  }
  if (!out.length) {
    out.push(['warn', '多约束同时冲突',
      `视野 ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)}mm、精度 ${fmt(R.tol * 1000, 0)}µm、WD ${fmt(R.wd, 0)}mm
       的组合在示例库内无解。建议放宽精度或调整工作距离后重新计算。`]);
  }
  return out;
}

function buildRisks(R) {
  const out = [];

  /* 精度风险 */
  if (R.tolRatio > 1.25) {
    out.push(['bad', `相机分辨率不足以支撑所填精度`,
      `按 3 像素准则，当前相机在 ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)}mm 视野下可检特征约 <b>${fmt(R.sysTol * 1000, 0)}µm</b>，
       而要求为 ${fmt(R.tol * 1000, 0)}µm。建议提高相机分辨率，或缩小单次拍摄视野后拼接。`]);
  } else if (R.tolRatio > 1) {
    out.push(['warn', '精度余量偏紧',
      `可达精度 <b>${fmt(R.sysTol * 1000, 0)}µm</b> 已接近要求值 ${fmt(R.tol * 1000, 0)}µm，
       对光学校正、镜头畸变与标定精度依赖较高，建议实测验证。`]);
  }

  /* 运动拖影 */
  if (S.moving && R.cam) {
    const shutter = R.cam.shutter || (R.activeCamEntry && R.activeCamEntry.cam.shutter);
    if (shutter === '卷帘') {
      out.push(['bad', '卷帘快门与运动被测物不匹配',
        `被测物存在运动时，卷帘快门逐行曝光会产生拖影或形变，测量结果不可信。建议改用全局快门传感器。`]);
    }
  }

  /* 远心建议 */
  if (R.needTele) {
    const teleCount = R.passed.filter(p => p.lens.type === 'tele').length;
    if (teleCount > 0 && R.teleMode !== 'off') {
      out.push(['info', '测量场景建议优先远心',
        `存在 ${fmt(S.heightDiff, 2)}mm 高度差，普通 FA 镜头存在透视误差与放大倍率漂移。
         远心镜头工作距离为固定值，机构设计须按标称值留位，不得按可调 WD 处理。`]);
    } else if (R.teleMode !== 'off') {
      out.push(['warn', '理想方案为远心，但当前视场无适配规格',
        `所需倍率 <b>${fmt(R.mReq, 3)}×</b> 对应视场 ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)}mm，
         而常规物方远心视场多在 30mm 以内（示例库 1×～4× 仅覆盖 2.2～8.8mm）。
         若该高度差确实影响判定，建议缩小单次视野后拼接，或向厂商索取大视场远心样本。`]);
    }
  } else if (S.measure && S.heightDiff > 0) {
    out.push(['ok', '透视误差处于可接受范围',
      `按高度差 ${fmt(S.heightDiff, 2)}mm、WD ${fmt(R.wd, 0)}mm 估算，普通 FA 镜头的透视偏移约
       <b>${fmt(R.perspErr * 1000, 1)}µm</b>，低于要求精度 ${fmt(R.tol * 1000, 0)}µm 的 30%，无需强制远心。`]);
  }

  /* 景深 */
  const best = R.passed[0];
  if (best && best.dof < Math.max(S.heightDiff, 0.1)) {
    out.push(['warn', '景深可能不足',
      `最佳方案估算景深 <b>${fmt(best.dof, 2)}mm</b>，小于高度差 ${fmt(S.heightDiff, 2)}mm。
       可缩小光圈至 F${Math.min(16, Math.round(S.fnum * 2))}（需重新评估衍射与照度），或改用远心镜头。`]);
  }

  /* 倍率过低 / 焦距超范围 */
  if (R.mReq < 0.045) {
    out.push(['warn', '放大倍率偏低',
      `倍率仅 <b>${fmt(R.mReq, 3)}×</b>，单位像素覆盖面积大，需确认镜头在小倍率下的边缘解析力与畸变表现。`]);
  }
  const nearF = LENSES.filter(l => l.f).map(l => l.f);
  if (R.fTarget > Math.max(...nearF) * 1.15) {
    out.push(['warn', '目标焦距超出常规样本范围',
      `所需焦距 ${fmt(R.fTarget, 1)}mm 大于库内最长 ${Math.max(...nearF)}mm，需向厂商索取长焦型号或缩短工作距离。`]);
  }
  if (R.fTarget < Math.min(...nearF) * 0.85) {
    out.push(['warn', '目标焦距低于常规样本范围',
      `所需焦距 ${fmt(R.fTarget, 1)}mm 小于库内最短 ${Math.min(...nearF)}mm，可考虑加接圈提升倍率，或改用短焦/显微镜头。`]);
  }

  /* 宽高比 */
  if (R.target.aspectWarn) {
    out.push(['info', '视野与传感器宽高比不一致',
      `视野比 ${fmt(R.fovW / R.fovH, 2)} 与传感器比 ${fmt(R.cam.sW / R.cam.sH, 2)} 差异较大，匹配按较严方向计算，
       实际画面单边会有富余。`]);
  }

  /* 接口 */
  if (R.cam.mount !== 'C') {
    out.push(['warn', '非 C 接口相机',
      `该相机为 ${R.cam.mount} 接口，内置示例镜头库以 C 口为主，需确认转接环或改用对应接口镜头系列。`]);
  }

  /* 光源相关校核 */
  if (R.lightRec) {
    const LR = R.lightRec;
    const top = LR.lights[0];
    /* 背光场景但背面不可安装 */
    if (LR.sceneKey === 'glass-transparent' && !S.lightBackOk) {
      out.push(['warn', '透明件轮廓方案需透射布光',
        `当前未勾选「背面可安装光源」，背光源方案被降权。透明玻璃测轮廓尺寸通常必须采用背光透射，
         请确认机构是否留出背面空间；若无法实现，只能靠低角度暗场看表面，轮廓精度会下降。`]);
    }
    /* 镜面高反光但选了低角度直射作为首选 */
    if (R.lightRec.reflect === 'high' && top && (top.light.form === 'ring-low' || top.light.form === 'bar')) {
      out.push(['warn', '高反光件直射照明存在热点风险',
        `镜面件首选光源为 <b>${LIGHT_FORM_NAME[top.light.form]}</b>，直射易形成局部过曝白斑。
         建议改用场景说明中的穹顶漫射光或同轴光，或加装偏振片。`]);
    }
    /* 需颜色还原但首选非高显色白光 */
    if (R.lightRec.colorNeed && top && top.light.color !== '白') {
      out.push(['warn', '颜色还原需求与首选光源冲突',
        `已勾选真实颜色还原，但当前综合首选为 <b>${top.light.color}光</b>（${LIGHT_FORM_NAME[top.light.form]}），
         会造成色偏。色差/印刷检测请选白光 CRI≥90 型号，并固定色温与曝光。`]);
    }
    /* 尺寸覆盖不足 */
    const undersized = LR.lights.filter(p => !p.sizeOk);
    if (undersized.length) {
      out.push(['info', '部分光源型号尺寸低于视野建议值',
        `当前视野 ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)}mm 建议发光面 ≥${undersized[0].needSize}mm，
         ${undersized.length} 款候选尺寸偏小，可能需要多灯拼接或更大规格，边缘照度需实测。`]);
    }
    /* 工作距离过短影响安装 */
    const tight = LR.lights[0] && LR.lights[0].installNotes.length;
    if (tight) {
      out.push(['warn', '工作距离与光源安装空间冲突',
        `WD ${fmt(R.wd, 0)}mm 下：${LR.lights[0].installNotes.join('；')}。
         建议增大工作距离，或改用更紧凑的光源形态。`]);
    }
  }

  if (!out.length) {
    out.push(['ok', '关键约束均已通过',
      `像圈覆盖、接口匹配、分辨率余量、景深与焦距偏差均在合理区间。仍建议样机实测 MTF 与畸变。`]);
  }

  return out.map(([cls, title, body]) => `
    <div class="notice ${cls}">
      <span class="ico">${cls === 'ok' ? '✓' : cls === 'info' ? 'i' : '!'}</span>
      <div><b>${title}</b><br>${body}</div>
    </div>`).join('');
}

function buildDetail(R) {
  const rows = [
    ['检测视野 FOV', `${fmt(R.fovW, 1)} × ${fmt(R.fovH, 1)} mm`],
    ['要求精度（最小可检特征）', `${fmt(R.tol, 4)} mm = ${fmt(R.tol * 1000, 0)} µm`],
    ['工作距离 WD', `${fmt(R.wd, 0)} mm`],
    ['— 像素分辨率需求（精度 ÷ 3）', `${fmt(R.need.pxResUm, 2)} µm/px`],
    ['— 所需横向 / 纵向像素', `${R.need.pxW} × ${R.need.pxH} px`],
    ['— 所需像素总量', `${fmt(R.need.mp, 2)} MP`],
    ['选用相机', `${R.cam.pxW}×${R.cam.pxH} @ ${R.cam.pixelUm}µm，${R.cam.fmt}`],
    ['— 传感器有效尺寸', `${fmt(R.cam.sW, 2)} × ${fmt(R.cam.sH, 2)} mm（对角 φ${fmt(R.cam.diag, 2)}）`],
    ['— 实际像素分辨率', `${fmt(R.res.pxResUm, 2)} µm/px（横向 FOV ÷ 像素数）`],
    ['— 系统可达精度（3px 准则）', `${fmt(R.sysTol * 1000, 0)} µm，余量 ${fmt(1 / R.tolRatio, 2)}×`],
    ['所需放大倍率 β', `max(${fmt(R.target.mW, 4)}, ${fmt(R.target.mH, 4)}) = ${fmt(R.mReq, 4)}×`],
    ['所需焦距 f（薄透镜）', `f = WD·β/(1+β) = ${fmt(R.wd, 0)}×${fmt(R.mReq, 4)}/(1+${fmt(R.mReq, 4)}) = <b>${fmt(R.fTarget, 2)} mm</b>`],
    ['景深估算依据', `DOF ≈ 2·F·c·(1+β)/β²，F=${S.fnum}，c=2×像素尺寸，β 取最佳方案实际值`],
    ['远心判定', R.needTele ? '需要（存在高度差或高倍率测量）' : '非必需',],
    ['候选镜头总数', `${LENSES.length} 款，通过硬性约束 ${R.passed.length} 款`],
    ['— 光源场景 / 目标', `${R.lightRec.scene.label} / ${R.lightRec.target.label}`],
    ['— 推荐打光方式', R.lightRec.primaryMethod],
    ['— 光源尺寸下限', `发光面 ≥ ${R.lightRec.lights[0] ? R.lightRec.lights[0].needSize : '—'} mm（按视野 ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)} 反推）`],
    ['— 光源评分权重', '打光方式 32% · 光源类型 32% · 反光适配 14% · 颜色 12% · 频闪 10% · 预算 8%']
  ];
  return `<table class="calc-table">${rows.map(([k, v]) =>
    `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
}

function updateBottom(R) {
  const box = $('bottombar');
  if (!R || R.error) {
    box.querySelector('.sum').innerHTML = `<b>—</b><span>请调整输入参数</span>`;
    return;
  }
  const best = R.passed[0];
  const topLight = R.lightRec && R.lightRec.lights[0];
  box.querySelector('.sum').innerHTML = best
    ? `<b>${best.lens.type === 'tele' ? best.lens.mag + '×' : best.lens.f + 'mm'}</b>
       <span>${best.lens.brand} ${best.lens.model} · ${R.passed.length} 款镜头${topLight ? ' · 光源 ' + LIGHT_FORM_NAME[topLight.light.form] : ''}</span>`
    : `<b>无匹配</b><span>需调整视野、精度或工作距离</span>`;
}

function bindCamPick() {
  if (S.camMode !== 'auto') return;
  document.querySelectorAll('[data-cam]').forEach(el => {
    el.addEventListener('click', () => {
      S.camId = el.dataset.cam;
      render();
      switchTab('lens');   // 选完相机直接看匹配镜头，省一次点击
    });
  });
}

function bindWdApply() {
  document.querySelectorAll('[data-wd]').forEach(el => {
    el.addEventListener('click', () => {
      const input = $('in-wd');
      if (!input) return;
      input.value = el.dataset.wd;
      S.wd = Number(el.dataset.wd);
      render();
      switchTab('lens');
    });
  });
}

function bindTabs() {
  const tabs = $('result-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });
}

/* ---------------- 交互绑定 ---------------- */
function bindSegs() {
  document.querySelectorAll('.seg').forEach(seg => {
    const key = seg.dataset.key;
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-v]');
      if (!btn) return;
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
      if (key === 'cammode') {
        S.camMode = btn.dataset.v;
        $('panel-auto').classList.toggle('hide', S.camMode !== 'auto');
        $('panel-manual').classList.toggle('hide', S.camMode !== 'manual');
      } else if (key === 'budget') {
        S.budget = btn.dataset.v;
      } else if (key === 'tele') {
        S.teleMode = btn.dataset.v;
      } else if (key === 'lightReflect') {
        S.lightReflect = btn.dataset.v;
      }
      render();
    });
  });
}

function bindInputs() {
  const ids = ['in-fovw', 'in-fovh', 'in-tol', 'in-wd', 'in-hd', 'in-fnum',
               'in-camw', 'in-camh', 'in-campx'];
  ids.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', render);
  });
  ['in-measure', 'in-moving', 'in-light-color', 'in-light-back'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', render);
  });
  ['in-camfmt', 'in-cammount', 'in-light-scene', 'in-light-target'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', render);
  });
}

/* ============================================================
   方案摘要图（Canvas 导出）
   ============================================================ */
function buildSummaryCanvas(R) {
  const W = 1080;
  const PAD = 60;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');

  const F = (w, s) => `${w} ${s}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const MONO = (w, s) => `${w} ${s}px ui-monospace, Consolas, "Courier New", monospace`;

  const INK = '#10202c', INK2 = '#3d5468', MUTED = '#6b8296',
        ACCENT = '#0a6b7c', LINE = '#dbe3e9', BG = '#ffffff';

  /* 先测量文本以便折行，使用两遍法：预估高度 */
  ctx.font = F(400, 22);
  const wrap = (text, maxW) => {
    const chars = text.split('');
    const lines = [];
    let cur = '';
    for (const ch of chars) {
      if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const best = R.passed[0];
  const alt = R.passed[1];
  const risks = [];

  if (R.tolRatio > 1.25) risks.push(`相机分辨率不足：可达 ${fmt(R.sysTol * 1000, 0)}µm，要求 ${fmt(R.tol * 1000, 0)}µm`);
  else if (R.tolRatio > 1) risks.push('精度余量偏紧，依赖光学校正与标定精度，建议实测验证');
  if (S.moving && R.cam && R.cam.shutter === '卷帘') risks.push('卷帘快门 + 运动被测物存在拖影风险，建议改全局快门');
  if (best && best.dof < S.heightDiff) risks.push(`景深 ${fmt(best.dof, 2)}mm 小于高度差 ${fmt(S.heightDiff, 2)}mm，需缩小光圈或改远心`);
  if (R.needTele) risks.push('测量场景存在高度差，优先选用远心镜头以消除透视误差');
  const LR = R.lightRec;
  const topLight = LR && LR.lights[0];
  if (LR && LR.sceneKey === 'glass-transparent' && !S.lightBackOk) risks.push('透明件轮廓建议采用背光透射，请确认背面安装空间');
  if (LR && LR.reflect === 'high' && topLight && (topLight.light.form === 'ring-low' || topLight.light.form === 'bar')) risks.push('高反光件直射照明有热点风险，建议穹顶漫射或同轴光');
  if (!risks.length) risks.push('关键约束通过，建议样机实测 MTF、畸变与边缘照度');

  /* 高度预估：新增光源区块 */
  const riskLines = risks.slice(0, 4).map(t => wrap('· ' + t, W - PAD * 2 - 8).length);
  const H = 300 + 260 + 250 + (alt ? 190 : 0) + 240 +
            riskLines.reduce((a, b) => a + b * 32, 0) + 120;

  cv.width = W;
  cv.height = H;

  /* 背景 */
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  /* 顶部色带 */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, '#0e8fa3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  let y = PAD + 34;

  /* 标题 */
  ctx.fillStyle = INK;
  ctx.font = F(700, 46);
  ctx.textAlign = 'left';
  ctx.fillText('工业视觉选型方案', PAD, y);

  ctx.font = F(400, 20);
  ctx.fillStyle = MUTED;
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  ctx.fillText(`Machine Vision Lens Selection  ·  ${dateStr}`, PAD, y + 34);

  /* 右下角编号 */
  ctx.textAlign = 'right';
  ctx.font = MONO(600, 20);
  ctx.fillStyle = '#a9bcc9';
  ctx.fillText(`FOV ${fmt(R.fovW, 0)}×${fmt(R.fovH, 0)}mm`, W - PAD, y + 4);
  ctx.textAlign = 'left';

  y += 84;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 34;

  /* 输入参数 */
  const cells = [
    ['检测视野', `${fmt(R.fovW, 1)} × ${fmt(R.fovH, 1)} mm`],
    ['精度要求', `${fmt(R.tol * 1000, 0)} µm`],
    ['工作距离', `${fmt(R.wd, 0)} mm`],
    ['所需焦距', `${fmt(R.fTarget, 1)} mm`],
    ['放大倍率', `${fmt(R.mReq, 3)} ×`],
    ['系统精度', `${fmt(R.sysTol * 1000, 0)} µm`]
  ];
  const cw = (W - PAD * 2) / 3;
  cells.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = PAD + col * cw;
    const cy = y + row * 86;
    ctx.font = F(400, 19);
    ctx.fillStyle = MUTED;
    ctx.fillText(c[0], x, cy);
    ctx.font = MONO(700, 30);
    ctx.fillStyle = INK;
    ctx.fillText(c[1], x, cy + 34);
  });
  y += 86 * 2 + 16;

  /* 相机方案 */
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 42;

  ctx.font = F(600, 20);
  ctx.fillStyle = ACCENT;
  ctx.fillText('推荐相机规格', PAD, y);
  y += 34;

  const camBrandModel = (R.activeCamEntry && R.activeCamEntry.cam.brand)
    ? `${R.activeCamEntry.cam.brand} ${R.activeCamEntry.cam.model}`
    : `${fmt(R.cam.mp, 1)}MP  ·  ${R.cam.fmt}  ·  ${R.cam.pxW}×${R.cam.pxH}`;
  ctx.font = MONO(700, 30);
  ctx.fillStyle = INK;
  ctx.fillText(camBrandModel, PAD, y);
  y += 34;

  ctx.font = F(400, 21);
  ctx.fillStyle = INK2;
  const camLine = `${R.cam.pixelUm}µm 像元 · ${(R.cam.shutter || (R.activeCamEntry && R.activeCamEntry.cam.shutter) || '—')}快门 · ${R.cam.mount} 接口 · 有效像面 ${fmt(R.cam.sW, 1)}×${fmt(R.cam.sH, 1)}mm`;
  ctx.fillText(camLine, PAD, y);
  y += 56;

  /* 镜头方案 */
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 42;

  ctx.font = F(600, 20);
  ctx.fillStyle = ACCENT;
  ctx.fillText('推荐镜头', PAD, y);
  y += 38;

  if (best) {
    ctx.font = MONO(700, 32);
    ctx.fillStyle = INK;
    ctx.fillText(`${best.lens.brand} ${best.lens.model}`, PAD, y);
    y += 32;

    ctx.font = F(400, 21);
    ctx.fillStyle = INK2;
    const spec = best.lens.type === 'tele'
      ? `物方远心 · ${best.lens.mag}× · WD ${best.lens.wd}mm 固定 · 像圈 φ${best.lens.ic}mm · ${best.lens.mp}MP`
      : `FA 定焦 · ${best.lens.f}mm · F${best.lens.fn} · 像圈 φ${best.lens.ic}mm · MOD ${fmt(best.lens.mod * 1000, 0)}mm · ${best.lens.mp}MP`;
    ctx.fillText(spec, PAD, y);
    y += 34;

    ctx.font = F(400, 21);
    ctx.fillStyle = MUTED;
    ctx.fillText(`实际视场 ${fmt(best.geo.fovW, 0)}×${fmt(best.geo.fovH, 0)}mm · 估算景深 ${fmt(best.dof, 2)}mm · 匹配度 ${Math.round(best.score)}/100`, PAD, y);
    y += 46;
  } else {
    ctx.font = F(400, 22);
    ctx.fillStyle = '#a8271f';
    ctx.fillText('当前条件下无匹配镜头，需调整视野、精度或工作距离。', PAD, y);
    y += 46;
  }

  /* 备选 */
  if (alt) {
    ctx.font = F(400, 20);
    ctx.fillStyle = MUTED;
    ctx.fillText(`备选：${alt.lens.brand} ${alt.lens.model}  ·  ${alt.lens.type === 'tele' ? alt.lens.mag + '×' : alt.lens.f + 'mm'}  ·  匹配度 ${Math.round(alt.score)}/100`, PAD, y);
    y += 42;
  }

  /* 光源方案 */
  if (LR && topLight) {
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 42;

    ctx.font = F(600, 20);
    ctx.fillStyle = ACCENT;
    ctx.fillText('推荐光源 · ' + LR.scene.label, PAD, y);
    y += 34;

    ctx.font = MONO(700, 30);
    ctx.fillStyle = INK;
    const lightTitle = `${topLight.light.brand} ${topLight.light.model}`;
    ctx.fillText(lightTitle, PAD, y);
    y += 34;

    ctx.font = F(400, 20);
    ctx.fillStyle = INK2;
    const lightSpec = `${LIGHT_FORM_NAME[topLight.light.form]} · ${LIGHT_METHOD_NAME[topLight.light.method]} · ${topLight.light.color}光${topLight.light.cri ? ' CRI' + topLight.light.cri : ''} · 发光面 ≥${topLight.needSize}mm${topLight.light.strobe ? ' · 支持频闪' : ''}`;
    ctx.fillText(lightSpec, PAD, y);
    y += 30;

    ctx.font = F(400, 20);
    ctx.fillStyle = MUTED;
    ctx.fillText('打光方式：' + LR.primaryMethod, PAD, y);
    y += 38;
  }

  /* 风险 */
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 38;

  ctx.font = F(600, 20);
  ctx.fillStyle = '#a4610a';
  ctx.fillText('风险与校核要点', PAD, y);
  y += 30;

  ctx.font = F(400, 20);
  ctx.fillStyle = INK2;
  risks.slice(0, 4).forEach(t => {
    const lines = wrap('· ' + t, W - PAD * 2 - 8);
    lines.forEach(ln => {
      ctx.fillText(ln, PAD, y);
      y += 30;
    });
  });

  /* 页脚 */
  y += 14;
  ctx.strokeStyle = LINE;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 26;

  ctx.font = F(400, 17);
  ctx.fillStyle = '#8b9fac';
  const foot = wrap('本方案由选型工具依据薄透镜近似、3 像素准则与光源场景规则自动生成。所列型号为市面在售真实产品，参数依厂商公开规格书录入，仅供方案评估；定型前请以最新规格书与样机实测结果为准。', W - PAD * 2);
  foot.forEach(ln => { ctx.fillText(ln, PAD, y); y += 25; });

  /* 裁剪到实际高度 */
  const finalH = Math.min(H, y + 24);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = finalH;
  out.getContext('2d').drawImage(cv, 0, 0);
  return out;
}

/* ---------------- 弹窗 ---------------- */
function openSummary() {
  if (!LAST || LAST.error) return;
  const cv = buildSummaryCanvas(LAST);
  const host = $('modal-canvas-host');
  host.innerHTML = '';
  host.appendChild(cv);
  $('modal').classList.add('show');
  $('modal').dataset.ready = '1';
}

function downloadSummary() {
  const host = $('modal-canvas-host');
  const cv = host.querySelector('canvas');
  if (!cv) return;
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  a.download = `工业视觉选型方案_${stamp}.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
}

/* 单页 A4 打印：方案摘要图 + 计算过程明细 */
function printSummary() {
  const cv = $('modal-canvas-host').querySelector('canvas');
  const w = window.open('', '_blank');
  if (!w) { window.print(); return; }
  const imageHTML = cv ? `<img src="${cv.toDataURL('image/png')}">` : '';
  const detailHTML = (LAST && !LAST.error) ? buildDetail(LAST) : '';
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const doc = PRINT_ENGINE.buildDocumentHTML({
    imageHTML, detailHTML, title: '工业视觉选型方案', date: dateStr
  });
  w.document.write(doc);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 350);
}

/* 整页打印（底栏按钮）：打印前临时展开计算过程明细，打印后还原折叠状态 */
function printPageWithDetail() {
  const det = document.querySelector('details.detail');
  const wasOpen = det ? det.open : false;
  if (det) det.open = true;
  const restore = () => {
    if (det) det.open = wasOpen;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  try { window.print(); } catch (e) { restore(); }
}

/* ---------------- 启动 ---------------- */
function init() {
  bindSegs();
  bindInputs();
  bindTabs();

  /* 兜底：渲染异常时给出可见提示而非空白 */
  window.addEventListener('error', (e) => {
    const box = $('out-metrics');
    if (box && !box.innerHTML) {
      box.innerHTML = `<div class="notice bad"><span class="ico">!</span>
        <div><b>计算出错</b><br>${e.message}，请刷新页面重试；若持续出现请调整输入参数。</div></div>`;
    }
  });

  $('btn-summary').addEventListener('click', openSummary);
  $('btn-summary-2').addEventListener('click', openSummary);
  $('btn-download').addEventListener('click', downloadSummary);
  $('btn-print-bar').addEventListener('click', printPageWithDetail);
  $('btn-print-modal').addEventListener('click', printSummary);
  $('modal-close').addEventListener('click', () => $('modal').classList.remove('show'));
  $('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') $('modal').classList.remove('show');
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);

