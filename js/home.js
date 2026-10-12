/* ThinkSecure home — one illustrated world
 *
 * Adapted from the illustrated prototype: each scene's button now opens the real
 * activity page, and the words come from the shared language files.
 *
 * Structure
 *  - #stage holds the four scene SVGs stacked in one box, plus #mascotLayer above them.
 *  - Each scene gets a "camera": its viewBox is recomputed for the current box so the
 *    important region stays in frame (wide screens show the whole scene with room for the
 *    words; portrait screens zoom onto the main object and mascot).
 *  - The mascot is lifted out of each scene into its own "pose" SVG in #mascotLayer, using
 *    the same camera, so it sits exactly where it was drawn. Anything in the scene that was
 *    painted in front of it (hills, the phone frame, foliage) becomes a mask on the pose, so
 *    the original layering is kept and no copy is left behind.
 *  - Between scenes a single "flyer" (the free-flying mascot from the Password scene) carries
 *    the character from one pose to the next while the new scene opens around its landing spot.
 */
(() => {
  const SVG = window.TS_SVG;
  const t0 = performance.now();
  // ?reduced previews the reduced-motion version without changing OS settings
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]reduced/.test(location.search);
  const hasGsap = typeof window.gsap !== 'undefined';
  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  // testing aid: ?skip jumps past the intro, ?fast runs every animation 20x faster
  if (hasGsap && /[?&]fast/.test(location.search)) gsap.globalTimeline.timeScale(20);

  const ACTS = [
    {
      key: 'quiz', href: 'pages/cyber-quiz.html', name: 'common.quiz',
      mascot: ['q-g102', 'q-g109'], pos: 'tl',
      roi: { wide: { x: 0, y: -250, w: 1672, h: 1160 }, tall: { x: 600, y: 120, w: 930, h: 780 } },
      c: { ink: '#0F244C', accent: '#D9301A', cta: '#F93519', ctaInk: '#FFFFFF', ground: '#0F244C', inkGround: '#FBF0D2', accentGround: '#FCC237', brand: '#F93519' },
    },
    {
      key: 'password', href: 'pages/password-checker.html', name: 'common.passwordChecker',
      mascot: ['p-g72'], pos: 'bl',
      roi: { wide: { x: 0, y: -120, w: 1672, h: 1060 }, tall: { x: 700, y: 40, w: 900, h: 860 } },
      c: { ink: '#FBF9F2', accent: '#93C5FB', cta: '#FBF9F2', ctaInk: '#0C2554', ground: '#0C2554', inkGround: '#FBF9F2', accentGround: '#93C5FB', brand: '#5445F0', haze: '#0C2554' },
    },
    {
      key: 'passphrase', href: 'pages/passphrase-maker.html', name: 'common.passphraseMaker',
      mascot: ['f-g61', 'f-g99'], pos: 'tl',
      roi: { wide: { x: 0, y: -250, w: 1672, h: 1160 }, tall: { x: 420, y: 60, w: 960, h: 760 } },
      c: { ink: '#062952', accent: '#037E6E', cta: '#062952', ctaInk: '#FDF9F1', ctaGround: '#92D4C2', ctaGroundInk: '#062952', ground: '#062952', inkGround: '#FDF9F1', accentGround: '#92D4C2', brand: '#03A18B' },
    },
    {
      // the artwork keeps its original name in home-scenes.js
      key: 'keychain', art: 'sticker', href: 'pages/sticker-generator.html', name: 'common.stickerStudio',
      mascot: ['s-mascot', 's-g157'], pos: 'bl', compact: true,
      roi: { wide: { x: 0, y: 140, w: 1448, h: 905 }, tall: { x: 100, y: 120, w: 1080, h: 880 } },
      c: { ink: '#FBF7FF', accent: '#F7A182', cta: '#F7A182', ctaInk: '#0E2755', ground: '#2E2177', inkGround: '#FBF7FF', accentGround: '#F7A182', brand: '#6446C7', haze: '#2E2177' },
    },
  ];
  const N = ACTS.length;
  // each activity's words live in the language files under home.scene.<key>.* and home.dock.<key>
  const t = (key) => window.I18n.t(key);
  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const stage = document.getElementById('stage');
  const scenesEl = document.getElementById('scenes');
  const mascotLayer = document.getElementById('mascotLayer');
  const copyLayer = document.getElementById('copy');
  const stopsEl = document.getElementById('stops');
  document.getElementById('brand').innerHTML = SVG.logo;
  document.getElementById('introLogo').innerHTML = SVG.logo;

  /* ---------- scenes ---------- */
  function skyColour(svg) {
    const bg = [...svg.querySelectorAll('rect')].find((r) => !r.closest('defs, clipPath, mask, symbol'));
    const fill = bg && bg.getAttribute('fill');
    const m = fill && fill.match(/url\(#([^)]+)\)/);
    if (m) {
      const stop = svg.getElementById ? svg.querySelector(`#${CSS.escape(m[1])} stop`) : null;
      if (stop) return stop.getAttribute('stop-color') || getComputedStyle(stop).stopColor;
    }
    return fill && fill.startsWith('#') ? fill : '#FBF6EA';
  }

  const scenes = ACTS.map((a, i) => {
    const el = document.createElement('div');
    el.className = 'scene';
    el.dataset.key = a.key;
    el.innerHTML = SVG[a.art || a.key];
    scenesEl.appendChild(el);
    const svg = el.querySelector('svg');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    const [, , W, H] = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
    a.sky = skyColour(svg);
    el.style.setProperty('--scene-sky', a.sky);
    return { a, i, el, svg, W, H, layers: [], pose: null, cam: null };
  });

  /* ---------- camera ---------- */
  const layoutKind = () => {
    const r = stage.getBoundingClientRect();
    return r.width / r.height >= 1 && r.width > 760 ? 'wide' : 'tall';
  };
  function camera(s) {
    const r = stage.getBoundingClientRect();
    const asp = r.width / r.height;
    const kind = layoutKind();
    const roi = s.a.roi[kind];
    const E = s.H * (kind === 'wide' ? 0.42 : 0.16);    // how far the sky may extend above the art
    let w = Math.min(s.W, Math.max(roi.w, roi.h * asp));
    let h = w / asp;
    if (h > s.H + E) { h = s.H + E; w = h * asp; }
    const x = clamp(roi.x + roi.w / 2 - w / 2, 0, Math.max(0, s.W - w));
    const y = clamp(roi.y + roi.h / 2 - h / 2, -E, s.H - h);
    return { x, y, w, h };
  }
  function applyCameras() {
    scenes.forEach((s) => {
      s.cam = camera(s);
      const vb = `${s.cam.x} ${s.cam.y} ${s.cam.w} ${s.cam.h}`;
      s.svg.setAttribute('viewBox', vb);
      if (s.pose) s.pose.svg.setAttribute('viewBox', vb);
    });
  }
  applyCameras();

  /* ---------- lift the mascot out of each scene ---------- */
  const rectsOverlap = (p, q) => p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top;
  function maskClone(orig) {
    const c = orig.cloneNode(true);
    const o = [orig, ...orig.querySelectorAll('*')];
    const k = [c, ...c.querySelectorAll('*')];
    k.forEach((n, j) => {
      n.removeAttribute('id'); n.removeAttribute('class'); n.removeAttribute('filter'); n.removeAttribute('mask');
      if (!(n instanceof SVGGraphicsElement)) return;
      const cs = getComputedStyle(o[j]);
      n.style.fill = cs.fill === 'none' ? 'none' : '#000';
      n.style.stroke = cs.stroke === 'none' ? 'none' : '#000';
      n.style.opacity = '1'; n.style.fillOpacity = '1'; n.style.strokeOpacity = '1';
    });
    return c;
  }

  let flyerSource = null;
  scenes.forEach((s) => {
    s.el.classList.add('is-on');                       // laid out for measuring
    const top = s.svg.querySelector(':scope > g[clip-path]') || s.svg;
    const parts = s.a.mascot.map((id) => s.svg.getElementById(id)).filter(Boolean);
    if (s.a.key === 'password' && parts[0]) flyerSource = parts[0].cloneNode(true);

    const pose = document.createElementNS(NS, 'svg');
    pose.setAttribute('class', 'pose');
    pose.setAttribute('viewBox', s.svg.getAttribute('viewBox'));
    pose.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const defs = document.createElementNS(NS, 'defs');
    pose.appendChild(defs);
    mascotLayer.appendChild(pose);

    const kids = [...top.children];
    const bobs = [];
    parts.forEach((part, pi) => {
      const pr = part.getBoundingClientRect();
      const after = kids.slice(kids.indexOf(part) + 1)
        .filter((k) => !parts.includes(k) && k instanceof SVGGraphicsElement && rectsOverlap(k.getBoundingClientRect(), pr));
      const holder = document.createElementNS(NS, 'g');
      if (after.length) {
        const m = document.createElementNS(NS, 'mask');
        m.id = `mask-${s.a.key}-${pi}`;
        m.setAttribute('maskUnits', 'userSpaceOnUse');
        ['x', 'y'].forEach((k) => m.setAttribute(k, '-4000'));
        ['width', 'height'].forEach((k) => m.setAttribute(k, '10000'));
        const white = document.createElementNS(NS, 'rect');
        ['x', 'y'].forEach((k) => white.setAttribute(k, '-4000'));
        ['width', 'height'].forEach((k) => white.setAttribute(k, '10000'));
        white.setAttribute('fill', '#fff');
        m.appendChild(white);
        after.forEach((k) => m.appendChild(maskClone(k)));
        defs.appendChild(m);
        holder.setAttribute('mask', `url(#${m.id})`);
      }
      const bob = document.createElementNS(NS, 'g');
      bob.setAttribute('class', 'bob');
      holder.appendChild(bob);
      pose.appendChild(holder);
      bob.appendChild(part);                            // moved, not copied: nothing is left in the scene
      bobs.push(bob);
    });
    // each mascot part gets a small "rig": float, tilt and squash about its own bottom centre.
    // Written straight to the transform attribute so nothing accumulates between tweens.
    const rigs = bobs.map((g) => {
      const bb = g.getBBox();
      return { el: g, y: 0, r: 0, sx: 1, sy: 1, ox: bb.x + bb.width / 2, oy: bb.y + bb.height };
    });
    s.pose = { svg: pose, bobs, rigs, anchor: bobs[0] };

    // wrap every remaining top-level layer: .par (pointer parallax) > .tr (transitions)
    const layers = [...top.children].filter((k) => k instanceof SVGGraphicsElement);
    layers.forEach((k, li) => {
      const par = document.createElementNS(NS, 'g');
      const tr = document.createElementNS(NS, 'g');
      par.setAttribute('class', 'par'); tr.setAttribute('class', 'tr');
      k.replaceWith(par); par.appendChild(tr); tr.appendChild(k);
      const depth = li === 0 ? 0 : li / (layers.length - 1);
      s.layers.push({ par, tr, depth });
    });
    s.el.classList.remove('is-on');
  });

  /* ---------- the flyer: the free-flying mascot pose, used between scenes ---------- */
  const flyer = document.createElementNS(NS, 'svg');
  flyer.setAttribute('class', 'flyer');
  const flyerG = document.createElementNS(NS, 'g');
  flyer.appendChild(flyerG);
  mascotLayer.appendChild(flyer);
  let FLY = { w: 100, h: 100 };
  if (flyerSource) {
    flyerSource.removeAttribute('id');
    flyerSource.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    flyerG.appendChild(flyerSource);
    const b = flyerG.getBBox();
    flyer.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`);
    FLY = { w: 100 * (b.width / b.height), h: 100 };
    flyer.style.width = `${FLY.w}px`; flyer.style.height = `${FLY.h}px`;
  }
  // stage-relative box of a pose's main body
  function anchorBox(s) {
    const st = stage.getBoundingClientRect();
    const r = s.pose.anchor.getBoundingClientRect();
    return { cx: r.left - st.left + r.width / 2, cy: r.top - st.top + r.height / 2, w: r.width, h: r.height };
  }
  const flyerAt = (b) => ({ x: b.cx - FLY.w / 2, y: b.cy - FLY.h / 2, scale: Math.min(b.h / FLY.h, (b.w * 1.15) / FLY.w) });

  /* ---------- copy + dock ---------- */
  // "Spot the <em>Scam</em>" becomes one span per word, so the words can arrive one by one.
  // Spaces are kept as written, so languages without them stay unbroken.
  const wrapWords = (text, em) => text.replace(/\S+/g, (w) => `<span class="w">${em ? `<em>${w}</em>` : w}</span>`);
  function writeTitle(a) {
    const h = a.copy.querySelector('h1');
    h.innerHTML = t(`home.scene.${a.key}.title`).split(/(<em>.*?<\/em>)/).map((part) => {
      const em = /^<em>(.*)<\/em>$/.exec(part);
      return em ? wrapWords(em[1], true) : wrapWords(part, false);
    }).join('');
    a.copyParts = [a.copy.querySelector('.eyebrow'), ...h.querySelectorAll('.w'), a.copy.querySelector('.lede'), a.copy.querySelector('.row')];
  }
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
  ACTS.forEach((a, i) => {
    const c = a.c;
    const art = document.createElement('article');
    art.className = `copy pos-${a.pos}${a.compact ? ' compact' : ''}`;
    art.id = `act-${a.key}`;
    art.setAttribute('aria-labelledby', `h-${a.key}`);
    art.style.cssText = `--c-ink:${c.ink};--c-accent:${c.accent};--c-cta:${c.cta};--c-cta-ink:${c.ctaInk};--c-haze:${c.haze || a.sky};--c-ink-ground:${c.inkGround};--c-accent-ground:${c.accentGround};--c-cta-ground:${c.ctaGround || c.cta};--c-cta-ground-ink:${c.ctaGroundInk || c.ctaInk}`;
    art.innerHTML = `
      <p class="eyebrow"><span class="num">0${i + 1} / 0${N}</span><span data-i18n="${a.name}"></span></p>
      <h1 id="h-${a.key}"></h1>
      <p class="lede" data-i18n="home.scene.${a.key}.lede"></p>
      <div class="row"><a class="cta" href="${a.href}" data-open="${i}"><span data-i18n="home.scene.${a.key}.cta"></span>${arrow}</a></div>`;
    copyLayer.appendChild(art);
    a.copy = art;
    writeTitle(a);

    const li = document.createElement('li');
    li.innerHTML = `<button class="stop" data-go="${i}" aria-controls="act-${a.key}"><span class="n" aria-hidden="true">${i + 1}</span><span class="label" data-i18n="home.dock.${a.key}"></span></button>`;
    stopsEl.appendChild(li);
  });
  const stops = [...stopsEl.querySelectorAll('.stop')];
  // fill in everything marked with a language key; i18n.js keeps it current from here on
  window.I18n.apply(document);

  function themeVars(i) {
    const a = ACTS[i];
    const dark = a.pos === 'bl';
    return {
      '--sky': a.sky,
      '--ground': a.c.ground,
      '--ink': a.c.ground,
      '--brand-accent': a.c.brand,
      '--dock-bg': dark ? 'rgba(255,255,255,.88)' : hexA(a.sky, 0.86),
      '--dock-on': a.c.ground,
      '--dock-on-ink': '#FFFFFF',
    };
  }
  function hexA(hex, al) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`;
  }
  function applyTheme(i, dur) {
    const v = themeVars(i);
    if (!hasGsap || !dur) Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val));
    else gsap.to(root, { ...v, duration: dur, ease: 'power2.inOut' });
  }

  /* ---------- state ---------- */
  const state = { index: 0, busy: false, queued: null, tl: null };
  let zTop = 1;

  function markCurrent(i) {
    stops.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
    document.title = `${t(ACTS[i].name)} — ThinkSecure`;
    if (location.hash.slice(1) !== ACTS[i].key) history.replaceState(null, '', `#${ACTS[i].key}`);
  }
  function showStatic(i) {
    scenes.forEach((s, k) => {
      s.el.classList.toggle('is-on', k === i);
      s.pose.svg.classList.toggle('is-on', k === i);
      ACTS[k].copy.classList.toggle('is-on', k === i);
    });
    scenes[i].el.style.zIndex = String(++zTop);
    markCurrent(i);
    applyTheme(i, 0);
  }

  /* idle life on the active pose: a slow float (upwards only, so masked edges never drift over the scene) */
  let idleTweens = [];
  function startIdle(i) {
    stopIdle();
    if (!hasGsap || reduced) return;
    const { rigs } = scenes[i].pose;
    idleTweens.push(gsap.to(rigs, { y: -7, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: drawRigs, onUpdateParams: [rigs] }));
    idleTweens.push(gsap.to(rigs[0], { r: 1.2, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: drawRigs, onUpdateParams: [rigs] }));
  }
  function drawRigs(rigs) {
    rigs.forEach((g) => g.el.setAttribute('transform',
      `translate(0 ${g.y}) translate(${g.ox} ${g.oy}) rotate(${g.r}) scale(${g.sx} ${g.sy}) translate(${-g.ox} ${-g.oy})`));
  }
  function resetRigs(rigs) {
    rigs.forEach((g) => Object.assign(g, { y: 0, r: 0, sx: 1, sy: 1 }));
    drawRigs(rigs);
  }
  const squash = (rigs) => ({ onUpdate: drawRigs, onUpdateParams: [rigs] });
  function stopIdle() {
    idleTweens.forEach((t) => t.kill()); idleTweens = [];
  }

  /* ---------- the transition ---------- */
  function go(to) {
    to = mod(to, N);
    if (to === state.index && !state.busy) return;
    if (state.busy) {                                    // interrupted: finish quickly, then continue
      state.queued = to;
      if (state.tl) state.tl.timeScale(3);
      return;
    }
    const from = state.index;
    state.index = to;
    markCurrent(to);
    if (!hasGsap || reduced) return quickSwap(from, to);

    state.busy = true;
    const A = scenes[from], B = scenes[to];
    const dir = Math.sign(wrapDelta(to - from)) || 1;
    stopIdle();
    resetRigs(A.pose.rigs);

    // scene B sits above A, closed to a point at the mascot's landing spot
    B.el.classList.add('is-on');
    B.el.style.zIndex = String(++zTop);
    const a = anchorBox(A), b = anchorBox(B);
    const st = stage.getBoundingClientRect();
    const R = Math.hypot(Math.max(b.cx, st.width - b.cx), Math.max(b.cy, st.height - b.cy)) + 40;
    gsap.set(B.el, { clipPath: `circle(0px at ${b.cx}px ${b.cy}px)` });
    B.layers.forEach((L) => gsap.set(L.tr, { y: 26 + L.depth * 90, opacity: 1 }));
    const fa = flyerAt(a), fb = flyerAt(b);
    const apex = Math.min(fa.y, fb.y) - Math.min(160, st.height * 0.18);

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        A.el.classList.remove('is-on');
        A.layers.forEach((L) => gsap.set(L.tr, { clearProps: 'all' }));
        gsap.set(B.el, { clearProps: 'clipPath' });
        A.pose.svg.classList.remove('is-on');
        ACTS[from].copy.classList.remove('is-on');
        state.busy = false; state.tl = null;
        startIdle(to);
        if (state.queued !== null) { const q = state.queued; state.queued = null; if (q !== state.index) go(q); }
      },
    });
    state.tl = tl;

    // 1. words leave first
    tl.to(ACTS[from].copyParts, { y: -14, opacity: 0, duration: 0.28, ease: 'power2.in', stagger: 0.025 }, 0);
    // 2. mascot gathers itself, then lifts off
    tl.to(A.pose.rigs, { sy: 0.93, sx: 1.05, duration: 0.16, ease: 'power2.out', ...squash(A.pose.rigs) }, 0);
    tl.set(flyer, { ...fa, rotation: 0, opacity: 1 }, 0.15);
    tl.to(A.pose.svg, { opacity: 0, duration: 0.12, ease: 'none' }, 0.15);
    tl.to(flyer, { x: fb.x, scale: fb.scale, duration: 0.8, ease: 'power2.inOut' }, 0.15);
    tl.to(flyer, { y: apex, duration: 0.38, ease: 'power2.out' }, 0.15);
    tl.to(flyer, { y: fb.y, duration: 0.46, ease: 'back.out(1.4)' }, 0.53);
    tl.to(flyer, { rotation: dir * 11, duration: 0.3, ease: 'power2.out' }, 0.15);
    tl.to(flyer, { rotation: 0, duration: 0.5, ease: 'back.out(2.2)' }, 0.5);
    // 3. the old world recedes by depth, the new one opens around the landing spot
    tl.to(A.layers.map((L) => L.tr), {
      y: (k) => A.layers[k].depth * 70, opacity: (k) => (A.layers[k].depth > 0.7 ? 0 : 1),
      duration: 0.7, ease: 'power2.in',
    }, 0.06);
    tl.to(B.el, { clipPath: `circle(${R}px at ${b.cx}px ${b.cy}px)`, duration: 0.85, ease: 'power3.inOut' }, 0.2);
    tl.to(B.layers.map((L) => L.tr), { y: 0, duration: 0.7, ease: 'expo.out', stagger: { each: 0.012 } }, 0.24);
    // theme (header ink, dock, ground) follows the new scene
    tl.add(() => applyTheme(to, 0.6), 0.3);
    // 4. landing: the scene's own pose takes over from the flyer
    gsap.set(B.pose.svg, { opacity: 0 });
    tl.add(() => B.pose.svg.classList.add('is-on'), 0.9);
    tl.to(B.pose.svg, { opacity: 1, duration: 0.14, ease: 'none' }, 0.9);
    tl.to(flyer, { opacity: 0, duration: 0.14, ease: 'none' }, 0.96);
    tl.fromTo(B.pose.rigs, { sy: 1.07, sx: 0.96 }, { sy: 1, sx: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)', ...squash(B.pose.rigs) }, 0.9);
    tl.add(() => resetRigs(A.pose.rigs), 0.9);
    // 5. then the words for the new activity
    tl.add(() => { ACTS[to].copy.classList.add('is-on'); ACTS[from].copy.classList.remove('is-on'); }, 0.62);
    tl.fromTo(ACTS[to].copyParts, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, 0.66);
  }
  const wrapDelta = (d) => mod(d + N / 2, N) - N / 2;

  function quickSwap(from, to) {
    // reduced motion: a short cross-fade, nothing travels
    const A = scenes[from], B = scenes[to];
    if (!hasGsap) { showStatic(to); return; }
    state.busy = true;
    B.el.classList.add('is-on'); B.el.style.zIndex = String(++zTop);
    B.pose.svg.classList.add('is-on');
    ACTS[to].copy.classList.add('is-on'); ACTS[from].copy.classList.remove('is-on');
    applyTheme(to, 0);
    gsap.timeline({ onComplete: () => { A.el.classList.remove('is-on'); A.pose.svg.classList.remove('is-on'); state.busy = false; if (state.queued !== null) { const q = state.queued; state.queued = null; go(q); } } })
      .fromTo([B.el, B.pose.svg], { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' })
      .to(A.pose.svg, { opacity: 0, duration: 0.2, ease: 'none' }, 0)
      .set([A.pose.svg, B.el], { clearProps: 'opacity' });
  }

  /* ---------- pointer parallax on the far layers only ---------- */
  const movers = scenes.map((s) => s.layers.filter((L) => L.depth > 0 && L.depth < 0.5).map((L) => ({
    d: L.depth,
    x: hasGsap ? gsap.quickTo(L.par, 'x', { duration: 1, ease: 'power3.out' }) : () => {},
    y: hasGsap ? gsap.quickTo(L.par, 'y', { duration: 1, ease: 'power3.out' }) : () => {},
  })));
  if (!reduced && matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', (e) => {
      if (state.busy) return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      movers[state.index].forEach((m) => { m.x(-nx * 26 * (0.4 + m.d)); m.y(-ny * 14 * (0.4 + m.d)); });
    });
  }

  /* ---------- input ---------- */
  const locked = () => document.body.classList.contains('is-intro');
  document.getElementById('next').addEventListener('click', () => go((state.queued ?? state.index) + 1));
  document.getElementById('prev').addEventListener('click', () => go((state.queued ?? state.index) - 1));
  stops.forEach((b, i) => b.addEventListener('click', () => go(i)));
  document.getElementById('brand').addEventListener('click', (e) => { e.preventDefault(); go(0); });
  addEventListener('keydown', (e) => {
    if (locked() || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go((state.queued ?? state.index) + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go((state.queued ?? state.index) - 1); }
    if (/^[1-4]$/.test(e.key)) go(+e.key - 1);
  });
  let wheelLock = 0;
  addEventListener('wheel', (e) => {
    if (locked()) return;
    const v = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(v) < 14 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 1100;
    go(state.index + (v > 0 ? 1 : -1));
  }, { passive: true });
  // swipe anywhere on the illustration
  let sx = null, sy = 0;
  addEventListener('pointerdown', (e) => { if (!locked() && e.isPrimary && !e.target.closest('button, a, select, label')) { sx = e.clientX; sy = e.clientY; } });
  addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(state.index + (dx < 0 ? 1 : -1));
  });

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (state.tl) state.tl.progress(1);
      applyCameras();
    }, 120);
  });

  /* ---------- curtain into an activity ---------- */
  const curtainPath = document.getElementById('curtainPath');
  const curtain = { top: 100, bottom: 100 };
  const drawCurtain = () => {
    const t = curtain.top, b = curtain.bottom;
    const bt = Math.sin(Math.PI * (1 - t / 100)) * 14, bb = Math.sin(Math.PI * (b / 100)) * 14;
    curtainPath.setAttribute('d', `M0 ${t} C30 ${t - bt} 70 ${t - bt} 100 ${t} V${b} C70 ${b + bb} 30 ${b + bb} 0 ${b}Z`);
  };
  // The buttons are ordinary links. With motion on, the curtain rises first and the page follows.
  copyLayer.addEventListener('click', (e) => {
    const link = e.target.closest('a.cta');
    if (!link || !hasGsap || reduced || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    curtainPath.style.fill = ACTS[+link.dataset.open].c.ground;
    curtain.top = 100; curtain.bottom = 100;
    gsap.to(curtain, { top: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: drawCurtain, onComplete: () => { location.href = link.href; } });
  });
  // the browser's Back button can bring this page back exactly as it was left: lift the curtain again
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    curtain.top = 100; curtain.bottom = 100; drawCurtain();
  });

  /* ---------- language ---------- */
  // i18n.js has already rewritten everything marked with a language key; the titles are built here
  addEventListener('languagechange', () => {
    ACTS.forEach(writeTitle);
    markCurrent(state.index);
  });

  /* ---------- start: intro, then the mascot flies into the first scene ---------- */
  // deep links (#quiz, #password, #passphrase, #sticker) open that activity directly
  const fromHash = ACTS.findIndex((a) => a.key === location.hash.slice(1));
  state.index = fromHash > 0 ? fromHash : 0;
  showStatic(state.index);
  window.TS_BUILD_MS = Math.round(performance.now() - t0);

  function enterWorld() {
    document.body.classList.remove('is-intro');
    if (!hasGsap || reduced) { startIdle(state.index); return; }
    const S = scenes[state.index], st = stage.getBoundingClientRect();
    const b = anchorBox(S), fb = flyerAt(b);
    state.busy = true;
    gsap.set(S.pose.svg, { opacity: 0 });
    const I = state.index;
    gsap.set(ACTS[I].copyParts, { opacity: 0, y: 22 });
    const tl = gsap.timeline({ onComplete: () => { state.busy = false; startIdle(I); if (state.queued !== null) { const q = state.queued; state.queued = null; go(q); } } });
    tl.from(S.layers.map((L) => L.tr), { y: (k) => 30 + S.layers[k].depth * 110, duration: 1.1, ease: 'expo.out', stagger: 0.012 }, 0)
      .fromTo(flyer, { x: st.width * 0.5 - FLY.w / 2, y: st.height + 60, scale: fb.scale * 0.8, rotation: -8, opacity: 1 },
        { x: fb.x, y: fb.y, scale: fb.scale, rotation: 0, duration: 0.95, ease: 'back.out(1.3)' }, 0.15)
      .to(S.pose.svg, { opacity: 1, duration: 0.14, ease: 'none' }, 1.05)
      .to(flyer, { opacity: 0, duration: 0.14, ease: 'none' }, 1.1)
      .fromTo(S.pose.rigs, { sy: 1.07, sx: 0.96 }, { sy: 1, sx: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)', ...squash(S.pose.rigs) }, 1.05)
      .to(ACTS[I].copyParts, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.55)
      .from('.top, .dock', { opacity: 0, y: (k) => (k ? 20 : -10), duration: 0.8, ease: 'expo.out' }, 0.7);
  }

  // The intro plays once per visit, so coming back from an activity goes straight to the scenes
  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem('thinksecure-intro') === 'seen';
    sessionStorage.setItem('thinksecure-intro', 'seen');
  } catch (e) { /* storage unavailable: just play it */ }

  if (!hasGsap || reduced || introSeen || /[?&]skip/.test(location.search)) {
    enterWorld();
  } else {
    const L = document.getElementById('introLogo');
    gsap.set('.intro-hills .h', { yPercent: 100 });
    const intro = gsap.timeline({ delay: 0.3 });
    intro.from(L.querySelector('.lg-think'), { scale: 0.3, yPercent: 30, opacity: 0, duration: 1, ease: 'elastic.out(1.2, 0.8)', transformOrigin: '50% 100%' })
      .from(L.querySelector('.lg-star'), { scale: 0, rotation: -200, duration: 0.9, ease: 'elastic.out(1.2, 0.8)', transformOrigin: '50% 50%' }, '-=0.6')
      .from(L.querySelector('.lg-lock'), { yPercent: 40, opacity: 0, duration: 0.6, ease: 'expo.out' }, '<')
      .from(L.querySelector('.lg-secure'), { scale: 0.3, yPercent: 30, opacity: 0, duration: 1, ease: 'elastic.out(1.2, 0.8)', transformOrigin: '50% 100%' }, '+=0.15')
      .to('.intro-sun', { scale: 1, duration: 1.1, ease: 'expo.out' }, '+=0.3')
      .to(L, { scale: 0.86, duration: 1.1, ease: 'expo.out' }, '<')
      .to('.intro-hills .h', { yPercent: -14, duration: 1, ease: 'expo.inOut', stagger: 0.1 }, '-=0.7')
      .add(enterWorld);
    const skip = () => { if (intro.progress() < 0.85) intro.progress(1); };
    document.getElementById('intro').addEventListener('click', skip);
    addEventListener('keydown', function k() { skip(); removeEventListener('keydown', k); });
  }
})();
