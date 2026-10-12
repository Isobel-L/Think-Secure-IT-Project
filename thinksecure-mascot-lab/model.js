/*
 * ThinkSecure mascot — character model v2 review page.
 * Static only: builds the face-language sheet, the review overlays
 * (silhouette, proportion guides, joint pivots) and measured proportions.
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const f1 = (n) => Math.round(n * 10) / 10;
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const svg = document.getElementById('mascot_v2');
  if (!svg) return;
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------
   * Screen-face language sheet. Same eye/mouth shape library as the
   * model; squints and angled eyes are straight "lid" cuts through the
   * luminous oval (the rig will drive these cuts later).
   *   lid: [top 0..1, angle° (+ = inner corner down), bottom 0..1]
   * ---------------------------------------------------------------- */
  const FACES = [
    { name: 'Neutral', note: 'rounded LED ovals', eyes: 'v2EyeOval', mouth: 'v2mSmile', cheeks: 0.85 },
    { name: 'Happy', note: 'crescent eyes', eyes: 'v2EyeCrescent', mouth: 'v2mOpen', cheeks: 1, eyeY: -2 },
    { name: 'Excited', note: 'star eyes', eyes: 'v2EyeStar', mouth: 'v2mGrin', cheeks: 1 },
    { name: 'Surprised', note: 'round discs', eyes: 'v2EyeRound', mouth: 'v2mO', cheeks: 0.3 },
    { name: 'Thinking', note: 'asymmetric squint', eyes: 'v2EyeOval', mouth: 'v2mDots', look: [10, -9], lidR: [0.46, -6, 0.1], cheeks: 0.3 },
    { name: 'Content', note: 'soft squint', eyes: 'v2EyeOval', mouth: 'v2mSmile', lid: [0.42, 0, 0.3], cheeks: 1 },
    { name: 'Suspicious', note: 'one eye narrowed', eyes: 'v2EyeOval', mouth: 'v2mFlat', look: [10, 0], lid: [0.58, 8, 0.26], lidR: [0.28, -2, 0.08], cheeks: 0.2 },
    { name: 'Warning', note: 'angled cut + amber', eyes: 'v2EyeOval', mouth: 'v2mFlat', lid: [0.4, 24, 0.06], tint: 0.9, cheeks: 0.2 },
    { name: 'Concerned', note: 'worried cut', eyes: 'v2EyeOval', mouth: 'v2mWobble', lid: [0.3, -16, 0], cheeks: 0.3 },
    { name: 'Sad', note: 'drooped cut + dim', eyes: 'v2EyeOval', mouth: 'v2mFrown', lid: [0.44, -22, 0.05], look: [0, 6], dim: 0.22, cheeks: 0 },
    { name: 'Determined', note: 'firm cut', eyes: 'v2EyeOval', mouth: 'v2mSmirk', lid: [0.34, 14, 0], cheeks: 0.6 },
    { name: 'Proud', note: 'crescent + spark', eyes: 'v2EyeCrescent', mouth: 'v2mSmirk', cheeks: 1, spark: true },
  ];

  // straight lid cuts through an eye centred at 0,0 (ry ≈ 30); side +1 = left eye
  function lidPath(top, ang, bot, side) {
    const yT = -36 + clamp(top, 0, 1) * 36;
    const yB = 36 - clamp(bot, 0, 1) * 36;
    const s = Math.tan(ang * DEG) * side, X = 60;
    return `M${-X} ${f1(yT - s * X)}L${X} ${f1(yT + s * X)}L${X} ${yB}L${-X} ${yB}Z`;
  }

  function buildFaceSheet() {
    const grid = $('faceGrid');
    if (!grid) return;
    FACES.forEach((f, i) => {
      const fig = document.createElement('figure');
      fig.className = 'face-tile';
      const s = mk('svg', { viewBox: '96 12 420 372', role: 'img', 'aria-label': f.name + ' expression' }, fig);
      const defs = mk('defs', null, s);
      mk('use', { href: '#head_base' }, s);
      if (f.tint) mk('rect', { x: 155, y: 196, width: 290, height: 152, fill: 'url(#v2Tint)', 'clip-path': 'url(#v2cScreen)', opacity: f.tint }, s);
      const face = mk('g', { filter: 'url(#v2Glow)' }, s);
      const look = f.look || [0, 0];
      const eyeY = f.eyeY || 0;
      [['L', 244, 1], ['R', 356, -1]].forEach(([side, cx, sg]) => {
        const lid = (side === 'R' && f.lidR) || f.lid || [0, 0, 0];
        const id = `faceLid_${i}_${side}`;
        mk('path', { d: lidPath(lid[0], lid[1], lid[2], sg) }, mk('clipPath', { id }, defs));
        const g = mk('g', { transform: `translate(${cx + look[0]} ${262 + eyeY + look[1]})` }, face);
        mk('use', { href: '#' + f.eyes }, mk('g', { 'clip-path': `url(#${id})` }, g));
      });
      mk('use', { href: '#' + f.mouth, transform: `translate(${300 + look[0] * 0.4} 312)` }, face);
      if (f.cheeks) {
        const ch = mk('g', { opacity: f.cheeks }, face);
        mk('use', { href: '#v2Cheek', x: 205, y: 300 }, ch);
        mk('use', { href: '#v2Cheek', x: 395, y: 300 }, ch);
      }
      if (f.spark) mk('use', { href: '#v2Spark', transform: 'translate(392 224) scale(.9)' }, face);
      if (f.dim) mk('rect', { x: 155, y: 196, width: 290, height: 152, fill: '#03061C', 'clip-path': 'url(#v2cScreen)', opacity: f.dim }, s);
      mk('use', { href: '#screen_glass' }, s);
      mk('use', { href: '#hat_art' }, s);
      mk('use', { href: '#antenna' }, s);
      mk('use', { href: '#ear_L_art' }, s);
      mk('use', { href: '#ear_R_art' }, s);
      const cap = document.createElement('figcaption');
      cap.innerHTML = `${f.name}<small>${f.note}</small>`;
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }

  /* ------------------------------------------------------------------
   * Geometry helpers (client rects → svg user units)
   * ---------------------------------------------------------------- */
  function toSvg(x, y) {
    const m = svg.getScreenCTM();
    return new DOMPoint(x, y).matrixTransform(m.inverse());
  }
  function boxOf(el) {
    const r = el.getBoundingClientRect();
    const a = toSvg(r.left, r.top), b = toSvg(r.right, r.bottom);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, w: b.x - a.x, h: b.y - a.y };
  }

  // vertical extents come from the posed render; widths from each part's own geometry
  const wOf = (el) => el.getBBox().width;
  function measure() {
    const hat = boxOf(svg.querySelector('#hat_crown > use'));
    const shell = boxOf(svg.querySelector('#head_base > use'));
    const pelvis = boxOf(svg.querySelector('#pelvis > use'));
    const pads = [boxOf($('shoulder_cap_L')), boxOf($('shoulder_cap_R'))];
    const ears = [boxOf($('ear_L_art')), boxOf($('ear_R_art'))];
    const gloves = [boxOf($('hand_L')), boxOf($('hand_R'))];
    const boots = [boxOf(svg.querySelector('#foot_L > use')), boxOf(svg.querySelector('#foot_R > use'))];
    const GROUND = Math.max(boots[0].y1, boots[1].y1);
    const top = hat.y0;
    const H = GROUND - top;
    const W = Math.max(ears[1].x1, gloves[1].x1, pads[1].x1) - Math.min(ears[0].x0, gloves[0].x0, pads[0].x0);
    const headW = wOf(svg.querySelector('#head_base > use'));
    return {
      top, ground: GROUND, H, W,
      headBottom: shell.y1, crotch: pelvis.y1,
      headW, headH: svg.querySelector('#head_base > use').getBBox().height,
      torsoW: wOf(svg.querySelector('#chest > use')),
      shoulderSpan: pads[1].x1 - pads[0].x0,
      foreW: wOf(svg.querySelector('#forearm_L > use')),
      gloveW: wOf($('hand_L')),
      thighW: wOf(svg.querySelector('#thigh_L > use')),
      bootW: wOf(svg.querySelector('#foot_L > use')),
    };
  }

  function fillMetrics(m) {
    const dl = $('metrics');
    if (!dl) return;
    const pct = (a) => Math.round((a / m.H) * 100) + '%';
    const rows = [
      ['Height ÷ width', (m.H / m.W).toFixed(2)],
      ['Head + hat share', pct(m.headBottom - m.top)],
      ['Torso share', pct(m.crotch - m.headBottom)],
      ['Leg share', pct(m.ground - m.crotch)],
      ['Head ÷ torso width', (m.headW / m.torsoW).toFixed(2) + '×'],
      ['Shoulder span ÷ head', (m.shoulderSpan / m.headW).toFixed(2) + '×'],
      ['Forearm ÷ head width', Math.round((m.foreW / m.headW) * 100) + '%'],
      ['Glove ÷ head width', Math.round((m.gloveW / m.headW) * 100) + '%'],
      ['Boot ÷ head width', Math.round((m.bootW / m.headW) * 100) + '%'],
    ];
    dl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  /* ------------------------------------------------------------------
   * Proportion guides
   * ---------------------------------------------------------------- */
  function buildGuides(m) {
    const g = $('guide_overlay');
    g.innerHTML = '';
    const lines = [
      [m.top, 'top'], [m.headBottom, 'head ⟂'], [m.crotch, 'crotch'], [m.ground, 'ground'],
    ];
    for (const [y] of lines) mk('line', { x1: 40, x2: 560, y1: f1(y), y2: f1(y), stroke: '#E0457B', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, g);
    const band = (y0, y1, label) => {
      const mid = (y0 + y1) / 2;
      mk('line', { x1: 48, x2: 48, y1: f1(y0 + 3), y2: f1(y1 - 3), stroke: '#E0457B', 'stroke-width': 2 }, g);
      const t = mk('text', { x: 54, y: f1(mid + 4), fill: '#E0457B', 'text-anchor': 'start' }, g);
      t.textContent = `${label} ${Math.round(((y1 - y0) / m.H) * 100)}%`;
    };
    band(m.top, m.headBottom, 'head + hat');
    band(m.headBottom, m.crotch, 'torso');
    band(m.crotch, m.ground, 'legs');
    // head vs torso width
    const hy = 120;
    mk('line', { x1: 300 - m.headW / 2, x2: 300 + m.headW / 2, y1: hy - 100, y2: hy - 100, stroke: '#12A4C9', 'stroke-width': 2 }, g);
    const t2 = mk('text', { x: 300, y: hy - 106, fill: '#12A4C9', 'text-anchor': 'middle' }, g);
    t2.textContent = `head ${Math.round(m.headW)} = ${(m.headW / m.torsoW).toFixed(2)}× torso`;
  }

  /* ------------------------------------------------------------------
   * Joint pivots overlay (proves every part is a separate, pivoted group)
   * ---------------------------------------------------------------- */
  const KIND_COL = { core: '#12A4C9', squash: '#F08A1C', secondary: '#8A4DFF', ik: '#1DAA6A', face: '#E0457B' };
  function buildPivots() {
    const g = $('pivot_overlay');
    g.innerHTML = '';
    const ov = g.getScreenCTM().inverse();
    const bones = [...svg.querySelectorAll('#mascot_art [data-bone]')].map((el) => {
      const [px, py] = el.dataset.pivot.split(',').map(Number);
      const p = new DOMPoint(px, py).matrixTransform(ov.multiply(el.getScreenCTM()));
      const parent = el.parentElement.closest('[data-bone]');
      return { el, id: el.id, x: p.x, y: p.y, kind: el.dataset.kind || 'core', parent };
    });
    const byEl = new Map(bones.map((b) => [b.el, b]));
    const gl = mk('g', null, g), gd = mk('g', null, g), gt = mk('g', null, g);
    const placed = [];
    for (const b of bones) {
      const col = KIND_COL[b.kind] || KIND_COL.core;
      const pb = b.parent && byEl.get(b.parent);
      if (pb) mk('line', { x1: f1(pb.x), y1: f1(pb.y), x2: f1(b.x), y2: f1(b.y), stroke: col, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.9 }, gl);
      mk('circle', { cx: f1(b.x), cy: f1(b.y), r: b.kind === 'face' ? 3.4 : 5, fill: '#fff', stroke: col, 'stroke-width': 2.4 }, gd);
      let lx = b.x + 7, ly = b.y - 7;
      for (let k = 0; k < 6 && placed.some((p) => Math.abs(p[0] - lx) < 62 && Math.abs(p[1] - ly) < 11); k++) ly += 11;
      placed.push([lx, ly]);
      const t = mk('text', { x: f1(lx), y: f1(ly), fill: col }, gt);
      t.textContent = b.id;
    }
  }

  /* ------------------------------------------------------------------
   * Toggles
   * ---------------------------------------------------------------- */
  function wire(m) {
    const body = document.body;
    const sync = () => {
      body.classList.toggle('sil', $('tSil').checked);
      body.classList.toggle('dark-bg', $('tDark').checked);
      $('guide_overlay').setAttribute('display', $('tGuides').checked ? 'inline' : 'none');
      const piv = $('tPivots').checked;
      $('pivot_overlay').setAttribute('display', piv ? 'inline' : 'none');
      svg.classList.toggle('pivots-on', piv);
      if (piv) buildPivots();
      if ($('tGuides').checked) buildGuides(measure());
    };
    ['tSil', 'tGuides', 'tPivots', 'tDark'].forEach((id) => $(id).addEventListener('change', sync));
    window.addEventListener('resize', () => { if ($('tPivots').checked) buildPivots(); });
    sync();
  }

  // v1 values were measured from previous-draft.svg with the same method;
  // reference values are read off the front view of the turnaround sheet.
  function fillCompareTable(m) {
    const tb = document.querySelector('#cmpTable tbody');
    if (!tb) return;
    const pct = (v) => Math.round(v * 100) + '%';
    const rows = [
      ['Height ÷ width (silhouette)', '1.75', (m.H / m.W).toFixed(2), '≈ 1.86'],
      ['Head + hat share of height', '55%', pct((m.headBottom - m.top) / m.H), '≈ 49%'],
      ['Torso share (chin → crotch)', '31%', pct((m.crotch - m.headBottom) / m.H), '≈ 31%'],
      ['Leg share (crotch → ground)', '14%', pct((m.ground - m.crotch) / m.H), '≈ 20%'],
      ['Head shell width : height', '1.20', (m.headW / m.headH).toFixed(2), 'wide, ≈ 1.4–1.5'],
      ['Screen width ÷ head width', '80%', pct(290 / m.headW), '≈ 90%'],
      ['Shoulder span ÷ head width', '0.77×', (m.shoulderSpan / m.headW).toFixed(2) + '×', '≈ 0.97×'],
      ['Forearm ÷ head width', '13%', pct(m.foreW / m.headW), '≈ 22%'],
      ['Glove ÷ head width', '16%', pct(m.gloveW / m.headW), '≈ 26%'],
      ['Thigh ÷ head width', '12%', pct(m.thighW / m.headW), '≈ 17%'],
      ['Boot ÷ head width', '24%', pct(m.bootW / m.headW), '≈ 37%'],
    ];
    tb.innerHTML = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  }

  function init() {
    buildFaceSheet();
    const m = measure();
    fillMetrics(m);
    fillCompareTable(m);
    buildGuides(m);
    wire(m);
    window.__model = { measure, buildPivots };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
