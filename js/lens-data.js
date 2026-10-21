/* ============================================================
   工业机器视觉镜头选型 — 数据与计算引擎
   所有型号参数为示例近似值，量产项目须以厂商最新规格书复核
   ============================================================ */

/* ---------- 传感器格式：标称像圈直径 (mm) ---------- */
const FORMAT_CIRCLE = {
  '1/3"':   6.0,
  '1/2.8"': 6.5,
  '1/2"':   8.0,
  '1/1.8"': 9.0,
  '1/1.2"': 13.4,
  '2/3"':  11.0,
  '1"':    16.0,
  '1.1"':  17.6,
  '1/1.7"': 15.9,
  '4/3"':  21.6
};

/* ---------- 常见相机预设（分辨率 / 像素尺寸 / 靶面 / 接口） ---------- */
const CAMERA_PRESETS = [
  { id:'c13-13',  label:'1.3MP  ·  1/3"  ·  1280×960',   w:1280, h:960,  px:3.75, fmt:'1/3"',   mount:'C' },
  { id:'c2-28',   label:'2MP  ·  1/2.8"  ·  1920×1080',  w:1920, h:1080, px:2.9,  fmt:'1/2.8"', mount:'C' },
  { id:'c5-23',   label:'5MP  ·  2/3"  ·  2448×2048',    w:2448, h:2048, px:3.45, fmt:'2/3"',   mount:'C' },
  { id:'c5-118',  label:'5MP  ·  1/1.8"  ·  2592×1944',  w:2592, h:1944, px:2.4,  fmt:'1/1.8"', mount:'C' },
  { id:'c8-118',  label:'8MP  ·  1/1.8"  ·  3096×2078',  w:3096, h:2078, px:2.4,  fmt:'1/1.8"', mount:'C' },
  { id:'c12-11',  label:'12MP  ·  1.1"  ·  4024×3036',   w:4024, h:3036, px:3.45, fmt:'1.1"',   mount:'C' },
  { id:'c20-1',   label:'20MP  ·  1"  ·  5472×3648',     w:5472, h:3648, px:2.4,  fmt:'1"',     mount:'C' },
  { id:'custom',  label:'自定义相机参数',                  w:2448, h:2048, px:3.45, fmt:'2/3"',   mount:'C' }
];

/* ---------- 相机库 ----------
   以传感器规格为档位，sensor 列真实传感器型号供核查；
   iface 为常见工业数据接口，shutter 影响运动被测物选型
------------------------------------------------------- */
const CAMERAS = [
  { id:'cam-13',  mp:1.3,  w:1280, h:960,  px:3.75, fmt:'1/3"',   mount:'C', shutter:'全局', iface:'GigE',  sensor:'Sony ICX445', tier:'entry' },
  { id:'cam-2',   mp:2.1,  w:1920, h:1080, px:2.9,  fmt:'1/2.8"', mount:'C', shutter:'卷帘', iface:'USB3',  sensor:'Sony IMX290', tier:'entry' },
  { id:'cam-2b',  mp:2.4,  w:1936, h:1216, px:5.86, fmt:'1/1.2"', mount:'C', shutter:'全局', iface:'GigE',  sensor:'Sony IMX174', tier:'mid' },
  { id:'cam-3',   mp:3.2,  w:2048, h:1536, px:3.45, fmt:'1/1.8"', mount:'C', shutter:'全局', iface:'GigE',  sensor:'Sony IMX265', tier:'mid' },
  { id:'cam-5',   mp:5.1,  w:2448, h:2048, px:3.45, fmt:'2/3"',   mount:'C', shutter:'全局', iface:'GigE',  sensor:'Sony IMX264', tier:'mid' },
  { id:'cam-6',   mp:6.3,  w:3096, h:2078, px:2.4,  fmt:'1/1.8"', mount:'C', shutter:'卷帘', iface:'USB3',  sensor:'Sony IMX178', tier:'mid' },
  { id:'cam-12',  mp:12.3, w:4024, h:3036, px:3.45, fmt:'1.1"',   mount:'C', shutter:'全局', iface:'10GigE', sensor:'Sony IMX304', tier:'high' },
  { id:'cam-12b', mp:12.0, w:4000, h:3000, px:1.85, fmt:'1/1.7"', mount:'C', shutter:'卷帘', iface:'USB3',  sensor:'Sony IMX226', tier:'high' },
  { id:'cam-20',  mp:20.0, w:5472, h:3648, px:2.4,  fmt:'1"',     mount:'C', shutter:'卷帘', iface:'USB3',  sensor:'Sony IMX183', tier:'high' }
];

/* ---------- 镜头库 ----------
   f      : 标称焦距 mm（远心镜头为 null）
   fn     : 最大光圈 F 数
   ic     : 像圈直径 mm（可覆盖的传感器格式）
   mount  : 接口
   mod    : 最近物距 m（从镜头前端计）
   mp     : 厂商标称适配传感器像素数（百万）
   mag    : 远心镜头固定放大倍率
   wd     : 远心镜头固定工作距离 mm
   dof    : 远心镜头标称景深 ±mm
   dist   : 畸变等级（低 / 中）
   tier   : 价格档位 entry / mid / high
------------------------------------------------------- */
const LENSES = [
  /* ── Computar MP2 系列 · FA 定焦 · 2/3" · 5MP ── */
  { brand:'Computar', series:'MP2', model:'M0824-MP2', f:8,  fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M1224-MP2', f:12, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M1620-MP2', f:16, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M2520-MP2', f:25, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M3520-MP2', f:35, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M5028-MP2', f:50, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'mid', type:'fa' },

  /* ── Computar MPW2 系列 · FA 定焦 · 1/1.8" · 10MP ── */
  { brand:'Computar', series:'MPW2', model:'M0824-MPW2', f:8,  fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:10, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M1224-MPW2', f:12, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:10, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M1620-MPW2', f:16, fn:2.0, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:10, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M2520-MPW2', f:25, fn:2.0, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:10, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M3520-MPW2', f:35, fn:2.0, ic:9, fmt:'1/1.8"', mount:'C', mod:0.15, mp:10, dist:'低', tier:'mid', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M5028-MPW2', f:50, fn:2.8, ic:9, fmt:'1/1.8"', mount:'C', mod:0.20, mp:10, dist:'低', tier:'mid', type:'fa' },

  /* ── Kowa LM-HC 系列 · FA 定焦 · 2/3" · 5MP · 大光圈 ── */
  { brand:'Kowa', series:'LM-HC', model:'LM8HC',  f:8,  fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-HC', model:'LM12HC', f:12, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-HC', model:'LM16HC', f:16, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-HC', model:'LM25HC', f:25, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-HC', model:'LM35HC', f:35, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-HC', model:'LM50HC', f:50, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:5, dist:'低', tier:'high', type:'fa' },

  /* ── Kowa LM-JC 系列 · FA 定焦 · 1" · 10MP ── */
  { brand:'Kowa', series:'LM-JC', model:'LM12JC', f:12, fn:1.8, ic:16, fmt:'1"', mount:'C', mod:0.15, mp:10, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-JC', model:'LM16JC', f:16, fn:1.8, ic:16, fmt:'1"', mount:'C', mod:0.20, mp:10, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-JC', model:'LM25JC', f:25, fn:1.8, ic:16, fmt:'1"', mount:'C', mod:0.25, mp:10, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-JC', model:'LM35JC', f:35, fn:1.8, ic:16, fmt:'1"', mount:'C', mod:0.30, mp:10, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-JC', model:'LM50JC', f:50, fn:1.8, ic:16, fmt:'1"', mount:'C', mod:0.40, mp:10, dist:'低', tier:'high', type:'fa' },

  /* ── VST VS-H1 系列 · FA 定焦 · 1/1.8" · 5MP ── */
  { brand:'VST', series:'VS-H1', model:'VS-0814H1', f:8,  fn:1.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'VST', series:'VS-H1', model:'VS-1214H1', f:12, fn:1.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'VST', series:'VS-H1', model:'VS-1614H1', f:16, fn:1.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'VST', series:'VS-H1', model:'VS-2514H1', f:25, fn:1.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'VST', series:'VS-H1', model:'VS-3514H1', f:35, fn:1.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'VST', series:'VS-H1', model:'VS-5018H1', f:50, fn:1.8, ic:9, fmt:'1/1.8"', mount:'C', mod:0.25, mp:5, dist:'低', tier:'mid', type:'fa' },

  /* ── 长步道 Chiopt LS-8M 系列 · FA 定焦 · 2/3" · 8MP ── */
  { brand:'长步道', series:'LS-8M', model:'LS-8M08', f:8,  fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M12', f:12, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M16', f:16, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M25', f:25, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M35', f:35, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M50', f:50, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:8, dist:'低', tier:'entry', type:'fa' },

  /* ── Moritex ML-MC 系列 · FA 定焦 · 2/3" · 5MP ── */
  { brand:'Moritex', series:'ML-MC', model:'ML-MC08HR', f:8,  fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Moritex', series:'ML-MC', model:'ML-MC12HR', f:12, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Moritex', series:'ML-MC', model:'ML-MC16HR', f:16, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Moritex', series:'ML-MC', model:'ML-MC25HR', f:25, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Moritex', series:'ML-MC', model:'ML-MC35HR', f:35, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'high', type:'fa' },
  { brand:'Moritex', series:'ML-MC', model:'ML-MC50HR', f:50, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:5, dist:'低', tier:'high', type:'fa' },

  /* ── Moritex MML-HR 系列 · 物方远心 · 2/3" ──
     远心工作距离固定，不可调；匹配依据为固定放大倍率 */
  { brand:'Moritex', series:'MML-HR', model:'MML1-HR-65D', f:null, mag:1.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:65,  dof:0.60, mp:5, dist:'极低', tier:'high', type:'tele' },
  { brand:'Moritex', series:'MML-HR', model:'MML2-HR-110D', f:null, mag:2.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:110, dof:0.32, mp:5, dist:'极低', tier:'high', type:'tele' },
  { brand:'Moritex', series:'MML-HR', model:'MML4-HR-65D', f:null, mag:4.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:65,  dof:0.10, mp:5, dist:'极低', tier:'high', type:'tele' }
];

/* ============================================================
   计算引擎
   ============================================================ */
const ENGINE = {

  /* 相机几何 */
  camera(pxW, pxH, pixelUm, fmt, mount) {
    const sW = pxW * pixelUm / 1000;         // 传感器有效宽度 mm
    const sH = pxH * pixelUm / 1000;         // 传感器有效高度 mm
    const diag = Math.hypot(sW, sH);
    return {
      pxW, pxH, pixelUm, fmt, mount,
      sW, sH, diag,
      mp: pxW * pxH / 1e6,
      circle: FORMAT_CIRCLE[fmt] || 11
    };
  },

  /* 需求侧目标参数 */
  target(fovW, fovH, cam) {
    // 覆盖视场所需的放大倍率：取宽/高两个方向的较大者
    const mW = cam.sW / fovW;
    const mH = cam.sH / fovH;
    const m = Math.max(mW, mH);
    const aspectWarn = Math.abs((fovW / fovH) - (cam.sW / cam.sH)) / (cam.sW / cam.sH) > 0.15;
    return { mW, mH, m, aspectWarn };
  },

  /* 薄透镜：由焦距求实际放大倍率 / 视场 */
  lensGeometry(lens, wd, cam) {
    if (lens.type === 'tele') {
      const m = lens.mag;
      return {
        m,
        fovW: cam.sW / m,
        fovH: cam.sH / m,
        wdActual: lens.wd,
        fixedWD: true
      };
    }
    const m = lens.f / (wd - lens.f);
    return {
      m,
      fovW: cam.sW / m,
      fovH: cam.sH / m,
      wdActual: wd,
      fixedWD: false
    };
  },

  /* 景深估算：DOF ≈ 2·N·c·(1+m)/m²，c 取 2 倍像素尺寸 */
  dof(lens, m, fnum, pixelUm) {
    if (lens.type === 'tele') return lens.dof * 2;
    if (!m || m <= 0) return 0;
    const c = 2 * pixelUm / 1000;            // 允许弥散圆 mm
    const N = fnum || (lens.fn ? Math.max(lens.fn, 2.8) : 4);
    return 2 * N * c * (1 + m) / (m * m);
  },

  /* 系统像素分辨率与可检特征 */
  resolution(fovW, cam) {
    const pxRes = fovW / cam.pxW;            // mm/px
    return { pxRes, minFeature3: pxRes * 3, minFeature2: pxRes * 2, pxResUm: pxRes * 1000 };
  },

  /* 评分（0-100） */
  score(lens, ctx) {
    const { targetM, cam, budget, wd, heightDiff } = ctx;
    let fScore, coverScore, mpScore, dofScore, tierScore;

    const geo = this.lensGeometry(lens, wd, cam);

    /* 焦距 / 倍率匹配 40%
       FA 焦距为离散档位，可通过微调 WD 精确覆盖视野；
       若所需 WD 落在合理机构范围内即视为可匹配，仅按调整幅度轻微扣分 */
    const dev = Math.abs(geo.m - targetM) / targetM;
    const needWD = lens.f ? lens.f * (1 + targetM) / targetM : null;
    const adjustable = needWD && needWD > wd * 0.55 && needWD < wd * 1.8;

    if (lens.type === 'tele') {
      fScore = Math.max(0, 100 * (1 - dev / 0.30));
    } else if (adjustable) {
      fScore = 100 - Math.min(18, Math.abs(needWD - wd) / wd * 45);
    } else {
      fScore = Math.max(0, 100 * (1 - dev / 0.30));
    }

    /* 像圈覆盖 15%：覆盖是底线（留 3% 标称容差），过度富余扣分 */
    const margin = (lens.ic - cam.diag) / cam.diag;
    if (margin < -0.03) coverScore = 0;
    else if (margin <= 0.35) coverScore = 100;
    else if (margin <= 0.60) coverScore = 100 - (margin - 0.35) / 0.25 * 28;
    else coverScore = Math.max(40, 72 - (margin - 0.60) / 0.40 * 20);

    /* 分辨率余量 20%：镜头标称适配像素低于相机时按差距分级降权，
       仅在差距过大（<0.4 倍）时硬淘汰 —— 工程上常以低标称镜头驱动高像素相机，
       代价是边缘解析力下降，需在结果中显式警示 */
    const mpRatio = lens.mp / cam.mp;
    if (mpRatio >= 0.95) mpScore = 100;
    else if (mpRatio >= 0.80) mpScore = 82;
    else if (mpRatio >= 0.60) mpScore = 64;
    else if (mpRatio >= 0.40) mpScore = 46;
    else mpScore = 20;

    /* 景深匹配 15% */
    const d = this.dof(lens, geo.m, ctx.fnum, cam.pixelUm);
    if (lens.type === 'tele') dofScore = heightDiff > 0 ? 100 : 85;
    else if (d >= heightDiff * 2 || heightDiff <= 0) dofScore = 100;
    else if (d >= heightDiff) dofScore = 80;
    else dofScore = Math.max(20, 80 * (d / Math.max(heightDiff, 0.01)));

    /* 预算匹配 10% */
    const tiers = {
      entry: { entry: 100, mid: 70, high: 35 },
      mid:   { entry: 80,  mid: 100, high: 65 },
      high:  { entry: 70,  mid: 85, high: 100 },
      any:   { entry: 90,  mid: 95, high: 90 }
    };
    tierScore = (tiers[budget] || tiers.any)[lens.tier] || 70;

    const total = fScore * 0.40 + coverScore * 0.15 + mpScore * 0.20 + dofScore * 0.15 + tierScore * 0.10;
    return {
      total: Math.round(total),
      parts: {
        焦距匹配: Math.round(fScore),
        像圈覆盖: Math.round(coverScore),
        分辨率余量: Math.round(mpScore),
        景深: Math.round(dofScore),
        预算: Math.round(tierScore)
      }
    };
  },

  /* 硬性约束筛选 */
  filter(lens, ctx) {
    const { cam, targetM, wd, fovW, fovH, teleMode, needTele } = ctx;
    const fails = [];

    if (lens.type === 'tele') {
      if (teleMode === 'off') fails.push('已排除远心镜头');
    } else if (teleMode === 'only') {
      fails.push('非远心镜头');
    }

    /* 像圈（留 3% 标称容差：2/3" 镜头配 2/3" 相机常出现 0.1mm 级理论超差） */
    if (lens.ic < cam.diag * 0.97) {
      fails.push(`像圈不足（相机对角 φ${cam.diag.toFixed(1)}mm，镜头 φ${lens.ic}mm）`);
    }

    /* 接口 */
    if (lens.mount !== cam.mount) {
      if (lens.mount === 'CS' && cam.mount === 'C') {
        /* C 口相机可配 CS 镜头，需 5mm 接圈 —— 本库暂无 CS 型号 */
      } else {
        fails.push(`接口不符（镜头 ${lens.mount} / 相机 ${cam.mount}）`);
      }
    }

    /* 分辨率：差距过大才硬淘汰，其余在评分中降权 */
    if (lens.mp < cam.mp * 0.4) {
      fails.push(`解析力差距过大（镜头标称 ${lens.mp}MP / 相机 ${cam.mp.toFixed(1)}MP）`);
    }

    /* 倍率 / 焦距偏差 */
    const geo = this.lensGeometry(lens, wd, cam);
    const dev = Math.abs(geo.m - targetM) / targetM;
    const limit = lens.type === 'tele' ? 0.25 : 0.35;
    if (dev > limit) {
      fails.push(lens.type === 'tele'
        ? `倍率偏差过大（需 ${targetM.toFixed(2)}×，镜头 ${lens.mag}×）`
        : `焦距偏差过大（偏差 ${(dev * 100).toFixed(0)}%）`);
    }

    /* 最近物距 */
    if (lens.type === 'fa' && lens.mod != null && wd < lens.mod * 1000) {
      fails.push(`低于最近物距（MOD ${(lens.mod * 1000).toFixed(0)}mm）`);
    }

    return fails;
  },

  /* 接圈补偿量估算：把当前 WD 下的倍率抬到目标倍率 */
  extension(lens, wd, targetM) {
    if (!lens.f) return null;
    const mNative = lens.f / (wd - lens.f);
    if (targetM <= mNative) return null;
    const k = targetM / mNative;
    if (k > 2.2) return null;
    const ext = lens.f * (k - 1) * (1 + mNative);
    return ext > 0.3 && ext < 60 ? ext : null;
  },

  /* ==========================================================
     正向推导：由视野与精度求相机规格
     精度按 3 像素准则（最小可检特征需 3 个像素覆盖）
     ========================================================== */
  requiredPixels(fovW, fovH, tolerance) {
    const pxRes = tolerance / 3;                 // 所需像素分辨率 mm/px
    return {
      pxRes,
      pxResUm: pxRes * 1000,
      pxW: Math.ceil(fovW / pxRes),
      pxH: Math.ceil(fovH / pxRes),
      mp: (fovW / pxRes) * (fovH / pxRes) / 1e6,
      tolerance
    };
  },

  /* 相机推荐 */
  recommendCameras(fovW, fovH, tolerance, opts) {
    const { moving, budget } = opts;
    const need = this.requiredPixels(fovW, fovH, tolerance);
    const tiers = {
      entry: { entry: 100, mid: 72, high: 38 },
      mid:   { entry: 82,  mid: 100, high: 68 },
      high:  { entry: 70,  mid: 86, high: 100 },
      any:   { entry: 92,  mid: 96, high: 90 }
    };

    const out = [];
    for (const cam of CAMERAS) {
      const needRescue = { cam, need, fails: [] };

      /* 像素数是否够 */
      const rw = cam.w / need.pxW;
      const rh = cam.h / need.pxH;
      if (rw < 1 || rh < 1) {
        needRescue.fails.push(
          `像素不足（需 ${need.pxW}×${need.pxH}，本机 ${cam.w}×${cam.h}）`
        );
        out.push(needRescue);
        continue;
      }

      const r = Math.min(rw, rh);

      /* 像素余量 45%：1.15～1.8 倍余量最经济可靠 */
      let pxScore;
      if (r < 1.05) pxScore = 80;
      else if (r < 1.15) pxScore = 90;
      else if (r <= 1.8) pxScore = 100;
      else if (r <= 3.0) pxScore = 100 - (r - 1.8) / 1.2 * 32;
      else pxScore = Math.max(50, 68 - (r - 3.0) * 4);

      /* 镜头库靶面覆盖 15%：推荐靶面必须能配到镜头，否则方案不可落地 */
      const camDiag = Math.hypot(cam.w * cam.px / 1000, cam.h * cam.px / 1000);
      const coverCount = LENSES.filter(l => l.ic >= camDiag * 0.97).length;
      const fitScore = coverCount >= 12 ? 100 : coverCount >= 6 ? 88 : coverCount >= 2 ? 62 : 20;

      /* 快门 15% */
      let shScore = 100;
      if (moving && cam.shutter === '卷帘') shScore = 22;
      else if (moving && cam.shutter === '全局') shScore = 100;
      else if (!moving && cam.shutter === '全局') shScore = 92;

      /* 预算 15% */
      const tierScore = (tiers[budget] || tiers.any)[cam.tier] || 70;

      /* 像元尺寸 10%：≥3.4µm 灵敏度好；1.8~2.4µm 需强化照明 */
      let pxSizeScore;
      if (cam.px >= 3.4) pxSizeScore = 100;
      else if (cam.px >= 2.8) pxSizeScore = 90;
      else if (cam.px >= 2.2) pxSizeScore = 76;
      else pxSizeScore = 62;

      const total = pxScore * 0.45 + fitScore * 0.15 + shScore * 0.15 +
                    tierScore * 0.15 + pxSizeScore * 0.10;

      needRescue.score = Math.round(total);
      needRescue.margin = r;
      needRescue.coverCount = coverCount;
      needRescue.parts = {
        像素匹配: Math.round(pxScore),
        镜头适配: Math.round(fitScore),
        快门适配: Math.round(shScore),
        预算: Math.round(tierScore),
        像元灵敏度: Math.round(pxSizeScore)
      };
      needRescue.achievable = 3 * Math.max(fovW / cam.w, fovH / cam.h);
      out.push(needRescue);
    }

    out.sort((a, b) => (b.score || 0) - (a.score || 0));
    return { need, list: out };
  }
};

