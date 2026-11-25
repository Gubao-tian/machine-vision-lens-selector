/* ============================================================
   工业机器视觉镜头选型 — 数据与计算引擎
   所有型号参数为示例近似值，量产项目须以厂商最新规格书复核
   ============================================================ */

/* ---------- 界面展示上限：让新入库品牌真正进入推荐列表 ----------
   相机 3→5、镜头 6→8、光源 6→8；仅控制展示数量，不改变硬性筛选 */
const DISPLAY_CAPS = { cameras: 5, lenses: 8, lights: 8 };

/* ---------- 传感器格式：标称像圈直径 (mm) ---------- */
const FORMAT_CIRCLE = {
  '1/3"':   6.0,
  '1/2.9"': 6.2,
  '1/2.8"': 6.5,
  '1/2.5"': 7.0,
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
   brand/model 为市面在售的真实相机型号（CST康视达、海康威视 HIKROBOT 等）；
   sensor 为传感器型号供核查；参数依据厂商公开规格书，定型前请复核
------------------------------------------------------- */
const CAMERAS = [
  { id:'cam-13',  brand:'CST康视达', model:'CST-CG013-80GM',  mp:1.3,  w:1280, h:1024, px:4.8,  fmt:'1/2"',    mount:'C', shutter:'全局', iface:'GigE',  sensor:'CMOS',       tier:'entry' },
  { id:'cam-2',   brand:'CST康视达', model:'CST-CR050-23GM',  mp:5.0,  w:2592, h:1944, px:2.2,  fmt:'1/2.5"',  mount:'C', shutter:'卷帘', iface:'GigE',  sensor:'AR0521',     tier:'entry' },
  { id:'cam-2b',  brand:'海康威视',   model:'MV-CS023-10GM',   mp:2.3,  w:1920, h:1200, px:5.86, fmt:'1/1.2"',  mount:'C', shutter:'全局', iface:'GigE',  sensor:'IMX249',     tier:'mid' },
  { id:'cam-3',   brand:'CST康视达', model:'CST-CG030-36GM',  mp:3.1,  w:2048, h:1536, px:3.45, fmt:'1/1.8"',  mount:'C', shutter:'全局', iface:'GigE',  sensor:'IMX265',     tier:'mid' },
  { id:'cam-5',   brand:'海康威视',   model:'MV-CS050-10GM',   mp:5.1,  w:2448, h:2048, px:3.45, fmt:'2/3"',    mount:'C', shutter:'全局', iface:'GigE',  sensor:'Sony IMX264', tier:'mid' },
  { id:'cam-5b',  brand:'CST康视达', model:'CST-CG050-75UM',  mp:5.1,  w:2448, h:2048, px:3.45, fmt:'2/3"',    mount:'C', shutter:'全局', iface:'USB3',  sensor:'IMX250',     tier:'mid' },
  { id:'cam-6',   brand:'CST康视达', model:'CST-CR060-18GM',  mp:6.3,  w:3072, h:2048, px:2.4,  fmt:'1/1.8"',  mount:'C', shutter:'卷帘', iface:'GigE',  sensor:'CMOS',       tier:'mid' },
  { id:'cam-8',   brand:'海康威视',   model:'MV-CS050-10UM',   mp:5.1,  w:2448, h:2048, px:3.45, fmt:'2/3"',    mount:'C', shutter:'全局', iface:'USB3',  sensor:'Sony IMX264', tier:'high' },
  { id:'cam-12',  brand:'CST康视达', model:'CST-CG123-31UMD', mp:12.3, w:4096, h:3000, px:3.45, fmt:'1.1"',    mount:'C', shutter:'全局', iface:'USB3',  sensor:'CMOS',       tier:'high' },
  { id:'cam-12b', brand:'CST康视达', model:'CST-CR120-9GM',   mp:12.0, w:4000, h:3000, px:1.85, fmt:'1/1.7"',  mount:'C', shutter:'卷帘', iface:'GigE',  sensor:'IMX226',     tier:'high' },
  { id:'cam-20',  brand:'CST康视达', model:'CST-CR200-6GM',   mp:20.0, w:5472, h:3648, px:2.4,  fmt:'1"',      mount:'C', shutter:'卷帘', iface:'GigE',  sensor:'IMX183',     tier:'high' },

  /* ── Basler ace 系列（产线主流进口品牌，参数据官网规格书）── */
  { id:'cam-basler-5', brand:'Basler', model:'acA2500-14gm', mp:5.0,  w:2592, h:1944, px:2.2,  fmt:'1/2.5"',  mount:'C', shutter:'卷帘', iface:'GigE',  sensor:'MT9P031',    tier:'mid' },
  { id:'cam-basler-23',brand:'Basler', model:'acA1920-40gm', mp:2.3,  w:1920, h:1200, px:5.86, fmt:'1/1.2"',  mount:'C', shutter:'全局', iface:'GigE',  sensor:'IMX249',     tier:'high' },

  /* ── 大恒图像 MERCURY2 水星二代（国产产线主力）── */
  { id:'cam-dh-503',   brand:'大恒图像', model:'MER2-503-36U3M', mp:5.1, w:2448, h:2048, px:3.45, fmt:'2/3"', mount:'C', shutter:'全局', iface:'USB3', sensor:'IMX264', tier:'mid' },
  { id:'cam-dh-pol',   brand:'大恒图像', model:'MER2-503-36U3M POL', mp:5.1, w:2448, h:2048, px:3.45, fmt:'2/3"', mount:'C', shutter:'全局', iface:'USB3', sensor:'IMX264 MZR 偏振', tier:'high' },

  /* ── 迈德威视 MindVision（国产经济型产线常用）── */
  { id:'cam-mv-500',   brand:'迈德威视', model:'MV-SUA500C/M', mp:5.0, w:2592, h:1944, px:2.2, fmt:'1/2.5"', mount:'C', shutter:'卷帘', iface:'USB3', sensor:'CMOS 1/2.5"', tier:'entry' }
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
  /* ── CST康视达 B系列 FA定焦 · 2/3" · 5MP（真实型号 CST-B0814-5M 等）── */
  { brand:'CST康视达', series:'B-5M', model:'CST-B0814-5M', f:8,  fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'CST康视达', series:'B-5M', model:'CST-B1214-5M', f:12, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'CST康视达', series:'B-5M', model:'CST-B1614-5M', f:16, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'CST康视达', series:'B-5M', model:'CST-B2514-5M', f:25, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'CST康视达', series:'B-5M', model:'CST-B3514-5M', f:35, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'mid', type:'fa' },
  { brand:'CST康视达', series:'B-5M', model:'CST-B5014-5M', f:50, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:5, dist:'低', tier:'mid', type:'fa' },

  /* ── CST康视达 B系列 FA定焦 · 2/3" · 千万像素 ── */
  { brand:'CST康视达', series:'B-10M', model:'CST-B0814-10M', f:8,  fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:10, dist:'极低', tier:'high', type:'fa' },
  { brand:'CST康视达', series:'B-10M', model:'CST-B1214-10M', f:12, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:10, dist:'极低', tier:'high', type:'fa' },
  { brand:'CST康视达', series:'B-10M', model:'CST-B1614-10M', f:16, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:10, dist:'极低', tier:'high', type:'fa' },
  { brand:'CST康视达', series:'B-10M', model:'CST-B2514-10M', f:25, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:10, dist:'极低', tier:'high', type:'fa' },
  { brand:'CST康视达', series:'B-10M', model:'CST-B3514-10M', f:35, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:10, dist:'极低', tier:'high', type:'fa' },
  { brand:'CST康视达', series:'B-10M', model:'CST-B5014-10M', f:50, fn:1.4, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:10, dist:'极低', tier:'high', type:'fa' },

  /* ── 海康威视 HIKROBOT FA定焦 · 2/3" · 5MP ── */
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF0824M-6MP', f:8,  fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:6, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF1224M-6MP', f:12, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:6, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF1624M-6MP', f:16, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:6, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF2524M-6MP', f:25, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:6, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF3524M-6MP', f:35, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:6, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-HF', model:'MVL-HF5024M-6MP', f:50, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:6, dist:'低', tier:'mid', type:'fa' },

  /* ── 长步道 Chiopt LS-8M 系列 · FA 定焦 · 2/3" · 8MP ── */
  { brand:'长步道', series:'LS-8M', model:'LS-8M08', f:8,  fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M12', f:12, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M16', f:16, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M25', f:25, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.15, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M35', f:35, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:8, dist:'低', tier:'entry', type:'fa' },
  { brand:'长步道', series:'LS-8M', model:'LS-8M50', f:50, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:8, dist:'低', tier:'entry', type:'fa' },

  /* ── 奥普特 OPT FA定焦 · 1/1.8" · 5MP ── */
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA0824-5M', f:8,  fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA1224-5M', f:12, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA1624-5M', f:16, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.10, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA2524-5M', f:25, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.15, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA3524-5M', f:35, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.20, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'奥普特', series:'OPT-FA', model:'OPT-FA5024-5M', f:50, fn:2.4, ic:9, fmt:'1/1.8"', mount:'C', mod:0.30, mp:5, dist:'低', tier:'entry', type:'fa' },

  /* ── 长焦 FA 定焦 · 75mm / 100mm（真实在售型号）──
     75mm 是中小视场、长工作距离工况的常用档位；海康 MF7538M-ML 为微距款，
     标称 WD 250~550mm、倍率 0.46~0.16×，正好覆盖 400mm / 0.236× 这一工况 */
  { brand:'海康威视', series:'MVL-MF', model:'MVL-MF7538M-ML', f:75, fn:3.8, ic:11, fmt:'2/3"', mount:'C', mod:0.25, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'奥普特', series:'OPT-C', model:'OPT-C7528-5M', f:75, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.60, mp:5, dist:'极低', tier:'mid', type:'fa' },
  { brand:'长步道', series:'FA', model:'FA7502A', f:75, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.40, mp:5, dist:'低', tier:'entry', type:'fa' },
  { brand:'Computar', series:'MP2', model:'M7528-MP2', f:75, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:1.5, dist:'低', tier:'mid', type:'fa' },
  { brand:'LumaSpec', series:'LS-FFL', model:'LS-FFL-1339', f:100, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:2.00, mp:8, dist:'低', tier:'mid', type:'fa' },
  { brand:'海康威视', series:'MVL-KF', model:'MVL-KF10020M-5MP-NIR', f:100, fn:2.0, ic:16, fmt:'1"', mount:'C', mod:0.50, mp:5, dist:'低', tier:'high', type:'fa' },

  /* ── Computar MPW2 超低畸变系列 · 2/3" · 5MP（产线精密测量常用）──
     畸变仅 0.01%~0.09%，带光圈锁紧螺丝，适合尺寸测量与高精度定位 */
  { brand:'Computar', series:'MPW2', model:'M0824-MPW2', f:8,  fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.05, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M1224-MPW2', f:12, fn:2.4, ic:11, fmt:'2/3"', mount:'C', mod:0.10, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M1620-MPW2', f:16, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M2518-MPW2', f:25, fn:1.8, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M3520-MPW2', f:35, fn:2.0, ic:11, fmt:'2/3"', mount:'C', mod:0.20, mp:5, dist:'极低', tier:'high', type:'fa' },
  { brand:'Computar', series:'MPW2', model:'M5028-MPW2', f:50, fn:2.8, ic:11, fmt:'2/3"', mount:'C', mod:0.30, mp:5, dist:'极低', tier:'high', type:'fa' },

  /* ── 大像圈 FA 定焦 · 1.1"（真实型号 Kowa LM-FC24M 系列）──
     1.1" 传感器对角 φ17.6mm，普通 C 口镜头像圈仅 φ16mm（1" 档）会严重暗角。
     Kowa FC24M 系列像圈 φ17.6~19mm、24MP、C 口、MOD 0.15m，
     专门覆盖 IMX253/304/530/540 等 1.1" 大靶面传感器。 */
  { brand:'Kowa', series:'LM-FC24M', model:'LM50FC24M', f:50,  fn:2.8, ic:18, fmt:'1.1"', mount:'C', mod:0.15, mp:24, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-FC24M', model:'LM75FC24M', f:75,  fn:2.5, ic:18, fmt:'1.1"', mount:'C', mod:0.15, mp:24, dist:'低', tier:'high', type:'fa' },
  { brand:'Kowa', series:'LM-FC24M', model:'LM100FC24M', f:100, fn:3.5, ic:19, fmt:'1.1"', mount:'C', mod:0.15, mp:24, dist:'低', tier:'high', type:'fa' },

  /* ── CST康视达 物方远心 · 2/3"（真实型号 CST-MF 系列）──
     远心工作距离固定，不可调；匹配依据为固定放大倍率 */
  { brand:'CST康视达', series:'MF远心', model:'CST-MF005F90H-D45', f:null, mag:0.5, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:90,  dof:1.20, mp:5, dist:'极低', tier:'high', type:'tele' },
  { brand:'CST康视达', series:'MF远心', model:'CST-MF01F40H-D45',  f:null, mag:1.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:65,  dof:0.60, mp:5, dist:'极低', tier:'high', type:'tele' },
  { brand:'CST康视达', series:'MF远心', model:'CST-MF01F60H-D66',  f:null, mag:2.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:110, dof:0.32, mp:5, dist:'极低', tier:'high', type:'tele' },
  { brand:'CST康视达', series:'MF远心', model:'CST-MF03F80H-D58',  f:null, mag:4.0, fn:null, ic:11, fmt:'2/3"', mount:'C', mod:null, wd:65,  dof:0.10, mp:5, dist:'极低', tier:'high', type:'tele' }
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
     零结果补救：当所需焦距超出库内最长焦距时，反推把 WD 缩到多少
     就能用现有镜头达成同一倍率。
     原理：m = f/(WD-f) ⇒ 给定目标倍率 m，WD = f·(1+m)/m
     ========================================================== */
  suggestWD({ fTarget, targetM, wd }) {
    const faLenses = LENSES.filter(l => l.type === 'fa' && l.f);
    const maxFocal = Math.max(...faLenses.map(l => l.f));
    const minFocal = Math.min(...faLenses.map(l => l.f));
    const overRange = fTarget > maxFocal * 1.02;
    const suggestions = [];

    if (overRange) {
      /* 先按 MOD 可行性过滤，再按焦距档去重（避免某档最高像素型号 MOD 过大
         而把同档其他可行型号一起误杀），最后取最长的几档焦距 */
      const byFocal = {};
      for (const lens of faLenses) {
        const needWD = lens.f * (1 + targetM) / targetM;
        const modMm = (lens.mod || 0) * 1000;
        /* WD 必须满足最近物距，且不能比原 WD 长（否则不叫"缩短补救"） */
        if (needWD < modMm * 1.02) continue;
        if (needWD >= wd) continue;
        if (!byFocal[lens.f] || lens.mp > byFocal[lens.f].lens.mp) {
          byFocal[lens.f] = { lens, needWD };
        }
      }
      const candidates = Object.values(byFocal)
        .sort((a, b) => b.lens.f - a.lens.f).slice(0, 3);
      for (const { lens, needWD } of candidates) {
        suggestions.push({
          lens,
          wd: Math.round(needWD),
          f: lens.f,
          shortenPct: Math.round((1 - needWD / wd) * 100)
        });
      }
      /* 优先推荐改动最小（WD 最接近原值）的方案 */
      suggestions.sort((a, b) => b.wd - a.wd);
    }

    let message = '';
    if (overRange && suggestions.length) {
      const s = suggestions[0];
      message = `所需焦距 ${fTarget.toFixed(1)}mm 超出库内最长 ${maxFocal}mm。` +
        `把工作距离从 ${Math.round(wd)}mm 缩短到约 ${s.wd}mm（缩短 ${s.shortenPct}%），` +
        `即可用 ${s.lens.brand} ${s.lens.model}（${s.f}mm）达到 ${targetM.toFixed(3)}× 倍率。`;
    } else if (overRange) {
      message = `所需焦距 ${fTarget.toFixed(1)}mm 超出库内最长 ${maxFocal}mm，` +
        `且现有镜头的最近物距均高于达成该倍率所需的工作距离，建议向厂商索取更长焦型号。`;
    }

    return {
      overRange,
      fTarget,
      maxFocal,
      minFocal,
      suggestions,
      message
    };
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

/* ============================================================
   光源库与选型引擎
   所有型号参数为示例近似值，量产项目须以厂商最新规格书复核
   ============================================================ */

/* ---------- 光源类型 / 打光方式名称 ---------- */
const LIGHT_FORM_NAME = {
  'ring-low': '低角度环形光',
  'ring-high': '高角度环形光',
  'bar': '条形光',
  'coax': '同轴光',
  'dome': '穹顶漫射光',
  'backlight': '背光源',
  'spot': '点光/聚光'
};
const LIGHT_METHOD_NAME = {
  dark: '暗场',
  bright: '明场',
  back: '背光透射',
  diffuse: '漫射'
};

/* ---------- 光源型号库 ----------
   form   : 光源类型
   method : 典型打光方式
   size   : 发光面尺寸 mm（环形=外径，条形=长度，背光=发光边长，穹顶=直径，同轴=窗口，点光=照射直径）
   color  : 常规出光色
   cri    : 显色指数（单色光为 null）
   strobe : 是否支持频闪
   angle  : 可选照射角度
------------------------------------------------------- */
const LIGHTS = [
  /* ── 低角度环形光 · 暗场 · 突出表面凹凸 ── */
  { brand:'CST康视达', series:'RS', model:'CST-RS15090-W', form:'ring-low', method:'dark', size:150, color:'白', cri:90, strobe:true,  angle:'低角度', tier:'mid',   note:'低角度斜射，划痕处散射成亮线' },
  { brand:'CST康视达', series:'RS', model:'CST-RS12070-W', form:'ring-low', method:'dark', size:120, color:'白', cri:90, strobe:true, angle:'低角度', tier:'mid',   note:'中口径低角度环形光' },
  { brand:'CST康视达', series:'RS', model:'CST-RS9070-W', form:'ring-low', method:'dark', size:90, color:'白', cri:88, strobe:true, angle:'低角度', tier:'entry', note:'紧凑型低角度环光' },
  { brand:'CST康视达', series:'RS', model:'CST-RS9030-R', form:'ring-low', method:'dark', size:90, color:'红', cri:null, strobe:true, angle:'低角度', tier:'entry', note:'红光增强深色金属划痕对比' },
  { brand:'奥普特', series:'OPT-LI', model:'OPT-LI15630-W', form:'ring-low', method:'dark', size:156, color:'白', cri:85, strobe:true, angle:'30°', tier:'entry', note:'经济型低角度环形光' },
  { brand:'奥普特', series:'OPT-LI', model:'OPT-LI9024-W', form:'ring-low', method:'dark', size:90, color:'白', cri:85, strobe:true, angle:'24°', tier:'entry', note:'紧凑型低角度环形光' },

  /* ── 高角度环形光 · 明场 · 均匀正面照明 ── */
  { brand:'CST康视达', series:'RS', model:'CST-RS10090-W', form:'ring-high', method:'bright', size:100, color:'白', cri:92, strobe:true, angle:'高角度', tier:'mid', note:'高角度均匀明场，颜色还原好' },
  { brand:'CST康视达', series:'HRS', model:'CST-HRS90-W', form:'ring-high', method:'bright', size:90, color:'白', cri:90, strobe:true, angle:'高角度', tier:'mid', note:'环形无影光，均匀正面照明' },
  { brand:'CST康视达', series:'HRS', model:'CST-HRS166-W', form:'ring-high', method:'bright', size:166, color:'白', cri:90, strobe:true, angle:'高角度', tier:'mid', note:'大口径环形无影光' },
  { brand:'奥普特', series:'OPT-RI', model:'OPT-RI12090-W', form:'ring-high', method:'bright', size:120, color:'白', cri:90, strobe:true, angle:'90°', tier:'entry', note:'经济型高角度环形光' },

  /* ── 条形光 · 方向性照明 / 多角度组合 ── */
  { brand:'CST康视达', series:'2BS', model:'CST-2BS14728-W', form:'bar', method:'bright', size:147, color:'白', cri:90, strobe:true, angle:'可调', tier:'mid', note:'标准条形光，可多角度组合' },
  { brand:'CST康视达', series:'2BS', model:'CST-2BS19238-W', form:'bar', method:'bright', size:192, color:'白', cri:90, strobe:true, angle:'可调', tier:'mid', note:'长条形光，适合大视野' },
  { brand:'CST康视达', series:'2BS', model:'CST-2BS14728-R', form:'bar', method:'dark', size:147, color:'红', cri:null, strobe:true, angle:'低角度', tier:'mid', note:'红光低角度条形，突出表面起伏' },
  { brand:'CST康视达', series:'2BS', model:'CST-2BS14728-B', form:'bar', method:'dark', size:147, color:'蓝', cri:null, strobe:true, angle:'低角度', tier:'mid', note:'蓝光提升玻璃表面散射对比' },
  { brand:'奥普特', series:'OPT-LB', model:'OPT-LB15030-W', form:'bar', method:'bright', size:150, color:'白', cri:88, strobe:true, angle:'30°', tier:'entry', note:'经济型条形光' },
  { brand:'奥普特', series:'OPT-LB', model:'OPT-LB200-W', form:'bar', method:'bright', size:200, color:'白', cri:88, strobe:true, angle:'45°', tier:'entry', note:'长条形光，适合大视野' },

  /* ── 同轴光 · 镜面反射 / 无阴影 ── */
  { brand:'CST康视达', series:'COS', model:'CST-COS50-W', form:'coax', method:'bright', size:50, color:'白', cri:92, strobe:false, angle:'同轴', tier:'high', note:'标准同轴光，适合镜面与平面件' },
  { brand:'CST康视达', series:'HCOS', model:'CST-HCOS100100-W', form:'coax', method:'bright', size:100, color:'白', cri:92, strobe:true, angle:'同轴', tier:'high', note:'高亮同轴光，大口径高均匀' },
  { brand:'奥普特', series:'OPT-CO', model:'OPT-CO5050-W', form:'coax', method:'bright', size:50, color:'白', cri:92, strobe:false, angle:'同轴', tier:'high', note:'小视场高均匀同轴光' },

  /* ── 穹顶漫射光 · 曲面均匀 / 消除热点 ── */
  { brand:'CST康视达', series:'DS', model:'CST-DS175-W', form:'dome', method:'diffuse', size:175, color:'白', cri:93, strobe:false, angle:'全向漫射', tier:'high', note:'圆顶漫射光，消除曲面反光热点' },
  { brand:'CST康视达', series:'DS', model:'CST-DS116-W', form:'dome', method:'diffuse', size:116, color:'白', cri:92, strobe:false, angle:'全向漫射', tier:'mid', note:'紧凑型圆顶漫射光' },
  { brand:'奥普特', series:'OPT-DM', model:'OPT-DM200-W', form:'dome', method:'diffuse', size:200, color:'白', cri:92, strobe:false, angle:'全向漫射', tier:'high', note:'大尺寸穹顶漫射光' },
  { brand:'奥普特', series:'OPT-DM', model:'OPT-DM120-W', form:'dome', method:'diffuse', size:120, color:'白', cri:90, strobe:false, angle:'全向漫射', tier:'mid', note:'紧凑型穹顶漫射光' },

  /* ── 背光源 · 轮廓 / 透射 ── */
  { brand:'CST康视达', series:'HFS', model:'CST-HFS120120-W', form:'backlight', method:'back', size:120, color:'白', cri:90, strobe:true, angle:'透射', tier:'mid', note:'标准底部面光源，高均匀背光' },
  { brand:'CST康视达', series:'HFS', model:'CST-HFS200200-W', form:'backlight', method:'back', size:200, color:'白', cri:90, strobe:true, angle:'透射', tier:'mid', note:'大面背光，适合大视野轮廓' },
  { brand:'奥普特', series:'OPT-BL', model:'OPT-BL150150-W', form:'backlight', method:'back', size:150, color:'白', cri:88, strobe:true, angle:'透射', tier:'entry', note:'经济型方形背光源' },
  { brand:'奥普特', series:'OPT-BL', model:'OPT-BL200200-W', form:'backlight', method:'back', size:200, color:'白', cri:88, strobe:true, angle:'透射', tier:'mid', note:'大面背光，适合大视野轮廓' },

  /* ── 点光 / 聚光 · 远距离局部照明 ── */
  { brand:'CST康视达', series:'SPL', model:'CST-SPL96-W', form:'spot', method:'bright', size:96, color:'白', cri:90, strobe:true, angle:'聚光', tier:'mid', note:'点光源，适合远距离局部照明' },
  { brand:'奥普特', series:'OPT-SP', model:'OPT-SP100-W', form:'spot', method:'bright', size:100, color:'白', cri:88, strobe:true, angle:'聚光', tier:'mid', note:'可调焦聚光光源' },

  /* ── CCS 西西斯（日本，产线高端检测常用）── */
  { brand:'CCS', series:'LFX3', model:'LFX3-100SW', form:'dome', method:'diffuse', size:100, color:'白', cri:95, strobe:false, angle:'平面无影', tier:'high', note:'平面无影光源，曲面/凹凸面/印字均匀检测' },
  { brand:'CCS', series:'LFX3', model:'LFX3-50SW', form:'dome', method:'diffuse', size:50, color:'白', cri:95, strobe:false, angle:'平面无影', tier:'high', note:'小尺寸平面无影，紧凑工位' },
  { brand:'CCS', series:'LFV3', model:'LFV3-100SW', form:'coax', method:'bright', size:102, color:'白', cri:95, strobe:false, angle:'同轴', tier:'high', note:'高分辨率同轴，镜面/ glossy 表面缺陷检测' },
  { brand:'CCS', series:'LFR', model:'LFR-100SW2', form:'ring-high', method:'bright', size:102, color:'白', cri:93, strobe:true, angle:'高角度', tier:'high', note:'面发光环形，金属件表面/字符检测' },
  { brand:'CCS', series:'LFR', model:'LFR-100RD2', form:'ring-high', method:'bright', size:102, color:'红', cri:null, strobe:true, angle:'高角度', tier:'high', note:'红光环形，提升金属表面对比' }
];

/* ---------- 场景规则矩阵 ----------
   methods : 打光方式基础分（0~100）
   forms   : 光源类型基础分（0~100）
   primary/guide/install/colorTip : 面向用户的结论与布光说明
------------------------------------------------------- */
const LIGHT_SCENES = {
  'metal-scratch': {
    label: '金属件 · 划痕压伤',
    desc: '划痕、压伤为表面微观起伏，靠明暗对比显现',
    methods: { dark: 100, bright: 58, diffuse: 62, back: 18 },
    forms: { 'ring-low': 100, 'bar': 90, 'coax': 78, 'spot': 62, 'ring-high': 50, 'dome': 42, 'backlight': 12 },
    primary: '暗场 · 低角度斜射',
    guide: '低角度光斜射表面，平整处反射光偏离镜头形成暗背景，划痕/压伤处漫反射进入镜头呈亮线。划痕有方向性时，用 2~4 支条形光从不同角度交替照明。',
    install: '环形光内径须大于镜头外径；低角度暗场需一定工作距离（建议 WD ≥ 80mm）。高反光金属优先选带漫射或偏振款以抑制热点。',
    colorTip: '通用选白光；深色金属可选红光增强划痕对比。'
  },
  'curve-reflect': {
    label: '曲面反光件',
    desc: '镜面曲面产生局部强反光热点，需均匀漫射打光',
    methods: { diffuse: 100, bright: 70, dark: 40, back: 20 },
    forms: { 'dome': 100, 'coax': 82, 'ring-high': 75, 'bar': 55, 'ring-low': 40, 'spot': 35, 'backlight': 15 },
    primary: '漫射 · 穹顶均匀照明',
    guide: '穹顶光将光线多次漫射后从各方向均匀入射，消除镜面热点，还原曲面轮廓与颜色。局部残存高光可用偏振片或同轴光压制。',
    install: '穹顶光需罩住被测物，占用较大安装空间（WD 通常 ≥ 150mm）；镜头前端与物体间须预留光源罩位置。',
    colorTip: '需颜色还原时选高显色白光（CRI ≥ 90）。'
  },
  'print-label': {
    label: '印刷标签',
    desc: '文字、条码、颜色印刷，需均匀明场照明与真实颜色还原',
    methods: { bright: 100, diffuse: 82, dark: 45, back: 25 },
    forms: { 'ring-high': 100, 'bar': 88, 'coax': 80, 'dome': 72, 'ring-low': 45, 'spot': 40, 'backlight': 18 },
    primary: '明场 · 高角度均匀照明',
    guide: '高角度环形光或对称双条形光提供均匀正面照明，保证字符与颜色一致。覆膜标签反光时改用同轴光或漫射光。',
    install: '光源尽量靠近镜头同轴安装以减少阴影；条形光对称布置于视野两侧，角度 30°~45°。',
    colorTip: '颜色/色差检测必须选高显色白光（CRI ≥ 90，色温 5000~6500K）；条码读取可用单色光。'
  },
  'glass-transparent': {
    label: '透明玻璃',
    desc: '透光件正面光穿透，需背光勾轮廓、暗场看表面',
    methods: { back: 100, dark: 85, bright: 35, diffuse: 45 },
    forms: { 'backlight': 100, 'bar': 80, 'ring-low': 72, 'coax': 40, 'ring-high': 35, 'spot': 42, 'dome': 30 },
    primary: '背光透射 + 低角度暗场',
    guide: '测轮廓尺寸用背光源透射成像，边缘呈暗线、背景明亮；查表面划痕/脏污改用低角度暗场，缺陷处散射光进入镜头。两种方法常需切换。',
    install: '背光源须安装在玻璃背面并与相机光轴对齐，物体两侧都要留出安装空间；背光发光面应大于视野 10% 以上。',
    colorTip: '轮廓检测选白光或红光（CMOS 响应高）；表面脏污可选蓝光提升散射对比。'
  },
  'pcb': {
    label: 'PCB / 电路板',
    desc: '阻焊层与丝印、焊盘并存，需均匀明场还原颜色并抑制焊盘镜面反光',
    methods: { bright: 100, diffuse: 88, dark: 52, back: 30 },
    forms: { 'coax': 100, 'dome': 90, 'ring-high': 82, 'bar': 78, 'ring-low': 48, 'spot': 42, 'backlight': 20 },
    primary: '同轴 · 均匀明场',
    guide: '同轴光把照明与相机光轴合一，消除焊盘、金手指的镜面反光并均匀照亮阻焊层与丝印，适合字符、极性标记与线路检测。需凸显焊点立体形态时切换到低角度暗场。',
    install: '同轴光源须与镜头光轴对齐；穹顶光需罩住板面并预留安装空间；大面积板可分多段条形光对称布置。',
    colorTip: '识别丝印颜色与元件色环须用高显色白光（CRI ≥ 90、色温 5000~6500K）。'
  },
  'plastic': {
    label: '塑胶 / 注塑件',
    desc: '哑光注塑表面，关注缩水、飞边、缺料与外观瑕疵',
    methods: { bright: 100, diffuse: 86, dark: 60, back: 45 },
    forms: { 'ring-high': 96, 'dome': 88, 'bar': 82, 'coax': 68, 'ring-low': 62, 'backlight': 50, 'spot': 46 },
    primary: '明场 · 均匀漫射',
    guide: '高角度环形光或穹顶光均匀照亮注塑表面，缩水、熔接痕等缺陷形成明暗对比；飞边、缺料可用低角度斜光增强轮廓。深色塑胶适当提高光源亮度。',
    install: '光源对称布置避免单侧阴影；穹顶光罩住工件时须确认 WD 留有余量。',
    colorTip: '外观颜色与色差检测选高显色白光（CRI ≥ 90）。'
  },
  'general': {
    label: '通用漫反射件',
    desc: '一般哑光表面，均匀明场照明即可',
    methods: { bright: 100, diffuse: 80, dark: 55, back: 35 },
    forms: { 'ring-high': 95, 'bar': 88, 'dome': 82, 'ring-low': 70, 'coax': 60, 'backlight': 45, 'spot': 50 },
    primary: '明场 · 均匀照明',
    guide: '高角度环形光或条形光提供均匀正面照明，适合颜色、字符与一般外观检测。',
    install: '光源对称布置，避免单侧阴影；发光面覆盖视野并留 20% 余量。',
    colorTip: '通用选高显色白光。'
  }
};

/* ---------- 检测目标修饰 ---------- */
const LIGHT_TARGETS = {
  'defect':     { label: '表面缺陷（划痕/压伤/脏污）', methodFactor: { dark: 1.15, bright: 0.90 }, formFactor: { 'ring-low': 1.15, 'bar': 1.10, 'coax': 0.95 } },
  'dimension':  { label: '轮廓/尺寸测量',              methodFactor: { back: 1.20, dark: 1.05 }, formFactor: { 'backlight': 1.20, 'coax': 1.05, 'bar': 1.05 } },
  'appearance': { label: '颜色/外观/字符',             methodFactor: { bright: 1.15, diffuse: 1.05 }, formFactor: { 'ring-high': 1.15, 'dome': 1.10, 'coax': 1.05 } },
  'presence':   { label: '有无/定位',                  methodFactor: { bright: 1.05, back: 1.10 }, formFactor: { 'backlight': 1.10, 'ring-high': 1.05, 'bar': 1.05 } },
  'ocr':        { label: '条码/字符识别（OCR）',       methodFactor: { bright: 1.20, diffuse: 1.05 }, formFactor: { 'coax': 1.15, 'ring-high': 1.10, 'bar': 1.08 } },
  'solder':     { label: '焊点/焊接质量',              methodFactor: { dark: 1.18, bright: 0.95 }, formFactor: { 'ring-low': 1.15, 'coax': 1.10, 'spot': 1.05 } },
  'level':      { label: '液位/灌装量',                methodFactor: { back: 1.25, dark: 1.05 }, formFactor: { 'backlight': 1.25, 'bar': 1.10, 'coax': 1.05 } }
};

/* ==========================================================
   光源选型引擎
   ========================================================== */
const LIGHT_ENGINE = {
  formName: LIGHT_FORM_NAME,
  methodName: LIGHT_METHOD_NAME,
  scenes: LIGHT_SCENES,
  targets: LIGHT_TARGETS,

  /* 按视野反推所需光源发光尺寸（mm），向上取整到 10mm */
  sizeAdvice(form, fovW, fovH) {
    const d = Math.hypot(fovW, fovH);
    const m = Math.max(fovW, fovH);
    let k = 1.2;
    if (form === 'backlight') k = 1.15;
    else if (form === 'dome') k = 1.30;
    else if (form === 'bar') k = 1.25;
    else if (form === 'ring-low' || form === 'ring-high') k = 1.10;
    else if (form === 'coax') k = 1.00;
    const base = (form === 'dome' || form === 'coax' || form === 'ring-low' || form === 'ring-high') ? d : m;
    return Math.ceil(base * k / 10) * 10;
  },

  recommend(ctx) {
    const scene = LIGHT_SCENES[ctx.scene] || LIGHT_SCENES.general;
    const target = LIGHT_TARGETS[ctx.target] || LIGHT_TARGETS.defect;
    const reflect = ctx.reflect || 'mid';
    const colorNeed = !!ctx.colorNeed;
    const moving = !!ctx.moving;
    const budget = ctx.budget || 'any';
    const fovW = Math.max(ctx.fovW || 10, 1);
    const fovH = Math.max(ctx.fovH || 10, 1);
    const wd = Math.max(ctx.wd || 100, 1);

    const tierScores = {
      entry: { entry: 100, mid: 75, high: 45 },
      mid:   { entry: 80,  mid: 100, high: 70 },
      high:  { entry: 70,  mid: 85,  high: 100 },
      any:   { entry: 92,  mid: 96,  high: 92 }
    };

    const out = [];
    for (const light of LIGHTS) {
      const parts = {};

      /* 打光方式 32% */
      const methodScore = (scene.methods[light.method] || 10) * (target.methodFactor[light.method] || 1);
      parts['打光方式'] = Math.round(Math.min(100, methodScore));

      /* 光源类型 32% */
      const formScore = (scene.forms[light.form] || 10) * (target.formFactor[light.form] || 1);
      parts['光源类型'] = Math.round(Math.min(100, formScore));

      /* 反光适配 14% */
      let reflectScore;
      if (reflect === 'high') {
        reflectScore = ({ dome: 100, coax: 95, 'ring-high': 80, spot: 70, bar: 55, 'ring-low': 40, backlight: 50 })[light.form] || 70;
      } else if (reflect === 'low') {
        reflectScore = ({ 'ring-low': 100, bar: 95, 'ring-high': 90, dome: 75, coax: 70, spot: 70, backlight: 60 })[light.form] || 85;
      } else {
        reflectScore = 88;
      }
      parts['反光适配'] = Math.round(reflectScore);

      /* 颜色还原 12%：需还原时显色指数是关键；否则单色光同样可用 */
      parts['颜色适配'] = colorNeed
        ? (light.cri >= 90 ? 100 : light.cri >= 80 ? 72 : 25)
        : (light.color === '白' ? 95 : 100);

      /* 频闪适配 10% */
      parts['频闪适配'] = Math.round(moving ? (light.strobe ? 100 : 30) : (light.strobe ? 92 : 100));

      let total = parts['打光方式'] * 0.32 + parts['光源类型'] * 0.32 +
                  parts['反光适配'] * 0.14 + parts['颜色适配'] * 0.12 +
                  parts['频闪适配'] * 0.10;

      /* 预算 8% */
      const tierScore = (tierScores[budget] || tierScores.any)[light.tier] || 90;
      total = total * 0.92 + tierScore * 0.08;

      /* 硬约束：尺寸覆盖不足则降权 */
      const needSize = this.sizeAdvice(light.form, fovW, fovH);
      const sizeOk = light.size >= needSize * 0.8;
      if (!sizeOk) total *= 0.72;

      /* 硬约束：安装空间 */
      const installNotes = [];
      let installPenalty = 0;
      if ((light.form === 'ring-low' || light.form === 'ring-high') && wd < 60) {
        installNotes.push('WD 过短，环形光安装空间不足'); installPenalty += 8;
      }
      if (light.form === 'dome' && wd < 120) {
        installNotes.push('WD 过短，穹顶光罩难以容纳'); installPenalty += 12;
      }
      if (light.form === 'coax' && wd < 50) {
        installNotes.push('WD 过短，分光镜安装困难'); installPenalty += 6;
      }
      if (light.form === 'backlight' && ctx.backlightOk === false) {
        installNotes.push('物体背面无安装空间，背光方案不可行'); installPenalty += 30;
      }
      total -= installPenalty;

      /* 需颜色还原但显色指数偏低：额外降权 */
      if (colorNeed && light.cri != null && light.cri < 80) total *= 0.85;

      total = Math.max(0, Math.min(100, total));
      out.push({ light, score: Math.round(total), parts, needSize, sizeOk, installNotes });
    }

    out.sort((a, b) => b.score - a.score);

    /* 按光源类型去重：每类最多 2 款，保证方案覆盖不同打光方式 */
    const byForm = {};
    const dedup = [];
    for (const p of out) {
      const k = p.light.form;
      if ((byForm[k] || 0) < 2) { byForm[k] = (byForm[k] || 0) + 1; dedup.push(p); }
      if (dedup.length >= DISPLAY_CAPS.lights) break;
    }
    if (dedup.length < DISPLAY_CAPS.lights - 1) {
      for (const p of out) {
        if (dedup.indexOf(p) < 0) dedup.push(p);
        if (dedup.length >= DISPLAY_CAPS.lights) break;
      }
    }

    return {
      scene, target, sceneKey: ctx.scene, targetKey: ctx.target,
      reflect, colorNeed, moving,
      primaryMethod: scene.primary,
      guide: scene.guide, install: scene.install, colorTip: scene.colorTip,
      wd, fovW, fovH,
      lights: dedup,
      all: out
    };
  }
};


