/* ThinkSecure home — one illustrated world
 *
 * Three layers, all driven by one piece of state (state.index):
 *  1. The illustrated environment. Each scene SVG (assets/, bundled by tools/bundle-scenes.mjs)
 *     is split at its "Title card" layer: a back plane holds what was painted before the card,
 *     a front plane what was painted after it (hills, people, the mascot). The drawn card is
 *     left out, so the artwork keeps its original layering around the live card.
 *  2. One persistent title card (HTML) between the two planes. All four drawings put their card
 *     in the same place, so on wide screens it is pinned to that spot in artwork units. It never
 *     moves: it flips on its horizontal axis and changes its words at the halfway point.
 *  3. The activity navigation at the top centre, with a sliding active indicator.
 * Changing activity cross-fades the scenes with a little depth parallax while the card flips.
 */
(() => {
  const SVG = window.TS_SVG;
  // ?reduced previews the reduced-motion version without changing OS settings
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]reduced/.test(location.search);
  const hasGsap = typeof window.gsap !== 'undefined';
  const root = document.documentElement;
  // testing aid: ?skip jumps past the intro, ?fast runs every animation 20x faster
  if (hasGsap && /[?&]fast/.test(location.search)) gsap.globalTimeline.timeScale(20);

  // every drawing is 1920 × 1080 and draws its title card here (the bottom is hidden by the land)
  const ART = { w: 1920, h: 1080 };
  const CARD = { x: 82.43, y: 206.42, w: 838.19, h: 870 };

  const ACTS = [
    {
      key: 'quiz', href: 'pages/cyber-quiz.html', name: 'common.quiz',
      sky: '#FBF3D7', ground: '#15264C', focus: 1290,
      card: { ink: '#15264C', accent: '#FC2A12', body: '#15264C', cta: '#FC2A12', accentSize: 96, ctaSize: 39.7, ctaH: 92.6, split: false },
    },
    {
      key: 'password', href: 'pages/password-checker.html', name: 'common.passwordChecker',
      sky: '#E5F1FC', ground: '#142B6B', focus: 1310,
      card: { ink: '#15264C', accent: '#0064FE', body: '#15264C', cta: '#0064FE', accentSize: 96, ctaSize: 39.7, ctaH: 92.6, split: true },
    },
    {
      key: 'passphrase', href: 'pages/passphrase-maker.html', name: 'common.passphraseMaker',
      sky: '#FCF8EE', ground: '#008994', focus: 1220,
      card: { ink: '#080B32', accent: '#008FBD', body: '#365881', cta: '#008FBD', accentSize: 72, ctaSize: 34, ctaH: 79.5, split: true },
    },
    {
      // the artwork keeps its original name in home-scenes.js; its sky is a sideways gradient
      key: 'keychain', art: 'sticker', href: 'pages/sticker-generator.html', name: 'common.stickerStudio',
      sky: ['#C9B1F7', '#FEC3BE'], ground: '#7958DC', focus: 1180,
      card: { ink: '#080B32', accent: '#5800F5', body: '#365881', cta: '#5800F5', accentSize: 82, ctaSize: 49.3, ctaH: 92.6, split: true },
    },
  ];
  const N = ACTS.length;
  const NS = 'http://www.w3.org/2000/svg';
  const t = (key) => window.I18n.t(key);
  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const flatSky = (a) => (Array.isArray(a.sky) ? a.sky[0] : a.sky);

  const planeBack = document.getElementById('planeBack');
  const planeFront = document.getElementById('planeFront');
  const card = document.getElementById('titleCard');
  const cardTitle = document.getElementById('cardTitle');
  const cardLede = document.getElementById('cardLede');
  const cardCta = document.getElementById('cardCta');
  const cardCtaText = document.getElementById('cardCtaText');
  const navInk = document.getElementById('navInk');
  const header = document.querySelector('.il-header');
  document.getElementById('brand').innerHTML = SVG.logo;
  document.getElementById('introLogo').innerHTML = SVG.logo;

  /* ---------- layer 1: split each drawing around its title card ---------- */
  // keep everything painted before the card (side 'back') or after it (side 'front'),
  // walking up through its ancestors so nested layers keep their own transforms.
  // The drawn panel, words and button give way to the live card; any other decoration in the
  // card layer (the sticker scene's sparkles) stays, painted on top of it.
  function cut(svg, side) {
    const drawn = svg.querySelector('[data-ts="title-card"]');
    for (let node = drawn; node !== svg; node = node.parentNode) {
      const sibs = [...node.parentNode.childNodes];
      const i = sibs.indexOf(node);
      (side === 'back' ? sibs.slice(i + 1) : sibs.slice(0, i))
        .forEach((n) => { if (n.localName !== 'defs') n.remove(); });
    }
    if (side === 'back') drawn.remove();
    else drawn.querySelectorAll(':scope > rect, :scope > text').forEach((n) => n.remove());
  }
  // sky behind and above the drawing, for screens taller than 16:9
  function addSky(svg, a) {
    const r = document.createElementNS(NS, 'rect');
    Object.entries({ x: -ART.w, y: -4 * ART.h, width: 3 * ART.w, height: 5 * ART.h }).forEach(([k, v]) => r.setAttribute(k, v));
    if (Array.isArray(a.sky)) {
      const g = document.createElementNS(NS, 'linearGradient');
      g.id = `sky-${a.key}`;
      Object.entries({ gradientUnits: 'userSpaceOnUse', x1: 0, x2: ART.w, y1: 0, y2: 0 }).forEach(([k, v]) => g.setAttribute(k, v));
      a.sky.forEach((c, k) => {
        const stop = document.createElementNS(NS, 'stop');
        stop.setAttribute('offset', k / (a.sky.length - 1));
        stop.setAttribute('stop-color', c);
        g.appendChild(stop);
      });
      svg.insertBefore(g, svg.firstChild);
      r.setAttribute('fill', `url(#${g.id})`);
    } else {
      r.setAttribute('fill', a.sky);
    }
    const defs = svg.querySelector(':scope > defs');
    svg.insertBefore(r, defs ? defs.nextSibling : svg.firstChild);
  }

  const parser = new DOMParser();
  let zTop = 1;
  const scenes = ACTS.map((a) => {
    const art = parser.parseFromString(SVG[a.art || a.key], 'image/svg+xml').documentElement;
    const [back, front] = ['back', 'front'].map((side) => {
      const svg = document.importNode(art, true);
      cut(svg, side);
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      svg.setAttribute('focusable', 'false');
      const el = document.createElement('div');
      el.className = 'scene';
      el.dataset.key = a.key;
      el.appendChild(svg);
      (side === 'back' ? planeBack : planeFront).appendChild(el);
      return { el, svg };
    });
    addSky(back.svg, a);
    // the mascot gets a wrapper we can nudge between scenes, without touching the drawing
    const rigs = [...front.svg.querySelectorAll('[data-ts="mascot"]')].map((m) => {
      const g = document.createElementNS(NS, 'g');
      m.replaceWith(g); g.appendChild(m);
      return g;
    });
    return { a, back, front, rigs, centre: null };
  });

  // where each mascot stands, in artwork units (measured once, while laid out)
  scenes.forEach((s) => {
    s.back.el.classList.add('is-on'); s.front.el.classList.add('is-on');
    const boxes = s.rigs.map((g) => g.getBBox()).filter((b) => b.width);
    if (boxes.length) {
      const x1 = Math.min(...boxes.map((b) => b.x)), y1 = Math.min(...boxes.map((b) => b.y));
      const x2 = Math.max(...boxes.map((b) => b.x + b.width)), y2 = Math.max(...boxes.map((b) => b.y + b.height));
      s.centre = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }
    s.back.el.classList.remove('is-on'); s.front.el.classList.remove('is-on');
  });

  /* ---------- camera: one shared view on wide screens, a framed view on tall ones ---------- */
  let wide = true;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    wide = vw >= 900 && vw / vh >= 1.3;
    root.dataset.layout = wide ? 'wide' : 'tall';
    const set = (k, v) => root.style.setProperty(k, v);
    if (wide) {
      // the full width of the drawing; taller screens get more sky above it,
      // wider ones lose a little more from the ground than from the sky
      // and the card always clears the header
      const u = vw / ART.w, visH = vh / u;
      const head = header.getBoundingClientRect().bottom;
      const y0 = Math.min(visH >= ART.h ? ART.h - visH : (ART.h - visH) * 0.35, CARD.y - (head + 16) / u);
      const vb = `0 ${y0} ${ART.w} ${visH}`;
      scenes.forEach((s) => { s.back.svg.setAttribute('viewBox', vb); s.front.svg.setAttribute('viewBox', vb); });
      set('--stage-h', `${vh}px`);
      set('--u', `${u}px`);
      set('--card-x', `${CARD.x * u}px`);
      set('--card-y', `${(CARD.y - y0) * u}px`);
      set('--card-w', `${CARD.w * u}px`);
      set('--card-h', `${CARD.h * u}px`);
    } else {
      // the card sits at the bottom, as tall as the longest activity needs so it never changes
      // size; the illustration fills the rest of the screen (sky under the header)
      const cardH = Math.min(tallCardHeight(), vh * 0.62);
      const stageH = Math.round(Math.max(vh * 0.38, vh - 16 - cardH + 28));
      const head = header.getBoundingClientRect().bottom;
      const u = Math.max(vw / ART.w, (stageH - head) / ART.h);
      const visW = vw / u, visH = stageH / u, y0 = ART.h - visH;
      scenes.forEach((s) => {
        const x0 = clamp(s.a.focus - visW / 2, 0, ART.w - visW);
        const vb = `${x0} ${y0} ${visW} ${visH}`;
        s.back.svg.setAttribute('viewBox', vb); s.front.svg.setAttribute('viewBox', vb);
      });
      set('--stage-h', `${stageH}px`);
      set('--u', `${u}px`);
      set('--tall-card-h', `${Math.ceil(cardH)}px`);
    }
  }
  function tallCardHeight() {
    card.style.height = 'auto';
    const h = Math.max(...ACTS.map((a, i) => { writeCard(i); return card.offsetHeight; }));
    card.style.height = '';
    writeCard(state.index);
    return h;
  }

  /* ---------- layer 2: the title card ---------- */
  function writeCard(i) {
    const a = ACTS[i], c = a.card;
    Object.entries({
      '--card-ink': c.ink, '--card-accent': c.accent, '--card-body': c.body, '--card-cta': c.cta,
      '--accent-scale': c.accentSize / 96, '--cta-size': c.ctaSize, '--cta-h': c.ctaH,
    }).forEach(([k, v]) => card.style.setProperty(k, v));
    card.dataset.key = a.key;
    card.toggleAttribute('data-split', c.split);
    // titles mark their coloured words with <em> in the language files
    cardTitle.innerHTML = t(`home.scene.${a.key}.title`);
    cardLede.textContent = t(`home.scene.${a.key}.lede`);
    cardCtaText.textContent = t(`home.scene.${a.key}.cta`);
    cardCta.setAttribute('href', a.href);
    cardCta.dataset.open = String(i);
    window.I18n.apply(card);                             // adds ?lang= to the link
  }

  /* ---------- layer 3: navigation ---------- */
  // The stops are the same links as on every activity page. Here they choose a scene;
  // the card's button is what goes in.
  const tabs = [...document.querySelectorAll('.il-stop[data-go]')];

  // the indicator slides to the selected tab (a CSS transition on its transform and size)
  function moveInk(i, animate) {
    const b = tabs[i];
    if (!animate) navInk.style.transition = 'none';
    Object.entries({ '--ink-x': `${b.offsetLeft}px`, '--ink-y': `${b.offsetTop}px`, '--ink-w': `${b.offsetWidth}px`, '--ink-h': `${b.offsetHeight}px` })
      .forEach(([k, v]) => navInk.style.setProperty(k, v));
    if (!animate) { navInk.getBoundingClientRect(); navInk.style.transition = ''; }
  }

  function markCurrent(i) {
    tabs.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    document.title = `${t(ACTS[i].name)} — ThinkSecure`;
    if (location.hash.slice(1) !== ACTS[i].key) history.replaceState(null, '', `#${ACTS[i].key}`);
  }
  function applyTheme(i) {
    const a = ACTS[i];
    root.style.setProperty('--sky', flatSky(a));
    root.style.setProperty('--ground', a.ground);
    root.style.setProperty('--brand-accent', a.card.accent);
  }

  /* ---------- state ---------- */
  const state = { index: 0, busy: false, queued: null, tl: null };

  function showStatic(i) {
    scenes.forEach((s, k) => {
      s.back.el.classList.toggle('is-on', k === i);
      s.front.el.classList.toggle('is-on', k === i);
    });
    scenes[i].back.el.style.zIndex = scenes[i].front.el.style.zIndex = String(++zTop);
    writeCard(i);
    markCurrent(i);
    applyTheme(i);
    moveInk(i, false);
  }

  function finish(from) {
    const A = scenes[from], B = scenes[state.index];
    [A.back.el, A.front.el].forEach((el) => el.classList.remove('is-on'));
    if (hasGsap) {
      gsap.set([A.back.el, A.front.el, B.back.el, B.front.el, ...A.rigs, ...B.rigs, card], { clearProps: 'transform,opacity' });
      gsap.set(card, { '--shade': 0 });
    }
    state.busy = false; state.tl = null;
    if (state.queued !== null) {
      const q = state.queued; state.queued = null;
      if (q !== state.index) go(q);
    }
  }

  /* ---------- the transition ---------- */
  function go(to, dir) {
    to = mod(to, N);
    if (state.busy) {                                    // already moving: finish quickly, then continue
      state.queued = to;
      if (state.tl) state.tl.timeScale(2.6);
      markCurrent(to);
      moveInk(to, true);
      return;
    }
    if (to === state.index) return;
    const from = state.index;
    state.index = to;
    dir = dir || Math.sign(wrapDelta(to - from)) || 1;
    markCurrent(to);
    moveInk(to, true);
    if (!hasGsap) { showStatic(to); return; }

    state.busy = true;
    const A = scenes[from], B = scenes[to];
    // the incoming scene lies on top of the outgoing one, in both planes
    zTop += 1;
    [B.back.el, B.front.el].forEach((el) => { el.classList.add('is-on'); el.style.zIndex = String(zTop); });
    const tl = gsap.timeline({ onComplete: () => finish(from) });
    state.tl = tl;

    if (reduced) {
      // low motion: a short cross-fade of the scenes and the card's words, nothing travels
      tl.fromTo([B.back.el, B.front.el], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
        .to(A.front.el, { opacity: 0, duration: 0.3, ease: 'none' }, 0)
        .to(card, { opacity: 0, duration: 0.12, ease: 'none' }, 0)
        .add(() => { writeCard(to); applyTheme(to); }, 0.12)
        .to(card, { opacity: 1, duration: 0.16, ease: 'none' }, 0.12);
      return;
    }

    // depth: the front plane travels further than the back one. Each is scaled up while it moves,
    // so no edge of the drawing is ever uncovered.
    const shift = Math.min(36, innerWidth * 0.025);
    gsap.set(B.back.el, { opacity: 0, x: dir * shift * 0.45, scale: 1.03 });
    gsap.set(B.front.el, { opacity: 0, x: dir * shift, scale: 1.05 });

    // 0–650ms: the old environment drifts away; the new one settles in over 150–650ms
    tl.to(A.back.el, { x: -dir * shift * 0.45, scale: 1.03, duration: 0.65, ease: 'power2.inOut' }, 0)
      .to(A.front.el, { x: -dir * shift, scale: 1.05, duration: 0.65, ease: 'power2.inOut' }, 0)
      .to(B.back.el, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 0.15)
      .to(B.back.el, { x: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, 0.1)
      .to(B.front.el, { opacity: 1, duration: 0.34, ease: 'power1.out' }, 0.14)
      .to(B.front.el, { x: 0, scale: 1, duration: 0.5, ease: 'power3.out' }, 0.15)
      // the old foreground leaves once the new one mostly covers the card's hidden lower half
      .to(A.front.el, { opacity: 0, duration: 0.24, ease: 'power1.in' }, 0.26);

    // the mascot leans a little towards where it stands next, and arrives from where it stood
    if (A.centre && B.centre) {
      const k = 0.16, cap = 90;
      const dx = clamp((B.centre.x - A.centre.x) * k, -cap, cap), dy = clamp((B.centre.y - A.centre.y) * k, -cap, cap);
      tl.to(A.rigs, { x: dx, y: dy, duration: 0.5, ease: 'power2.in' }, 0)
        .fromTo(B.rigs, { x: -dx, y: -dy }, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' }, 0.15);
    }

    // 50–500ms: the card turns away, changes its words edge-on, and turns back to face us
    const turn = 90 * dir;
    tl.to(card, { rotationX: -turn, '--shade': 0.22, duration: 0.2, ease: 'power2.in' }, 0.05)
      .add(() => { writeCard(to); applyTheme(to); }, 0.25)
      .fromTo(card, { rotationX: turn, '--shade': 0.22 }, { rotationX: 0, '--shade': 0, duration: 0.25, ease: 'back.out(1.4)', immediateRender: false }, 0.25);
  }
  const wrapDelta = (d) => mod(d + N / 2, N) - N / 2;

  /* ---------- input ---------- */
  const locked = () => document.body.classList.contains('is-intro');
  const target = () => (state.queued ?? state.index);
  // a plain click chooses the scene; Ctrl/Cmd-click still opens the activity itself
  const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  tabs.forEach((b, i) => b.addEventListener('click', (e) => { if (!plainClick(e)) return; e.preventDefault(); go(i); }));
  ['brand', 'navHome'].forEach((id) => document.getElementById(id).addEventListener('click', (e) => { if (!plainClick(e)) return; e.preventDefault(); go(0); }));
  addEventListener('keydown', (e) => {
    if (locked() || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(target() + 1, 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(target() - 1, -1); }
    if (/^[1-4]$/.test(e.key)) go(+e.key - 1);
  });
  let wheelLock = 0;
  addEventListener('wheel', (e) => {
    if (locked()) return;
    const v = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(v) < 14 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 1000;
    go(target() + (v > 0 ? 1 : -1), v > 0 ? 1 : -1);
  }, { passive: true });
  // swipe anywhere on the illustration
  let sx = null, sy = 0;
  addEventListener('pointerdown', (e) => { if (!locked() && e.isPrimary && !e.target.closest('button, a, select, label')) { sx = e.clientX; sy = e.clientY; } });
  addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(target() + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (state.tl) state.tl.progress(1);
      layout();
      moveInk(target(), false);
    }, 120);
  });

  /* ---------- curtain into an activity ---------- */
  const curtainPath = document.getElementById('curtainPath');
  const curtain = { top: 100, bottom: 100 };
  const drawCurtain = () => {
    const ct = curtain.top, cb = curtain.bottom;
    const bt = Math.sin(Math.PI * (1 - ct / 100)) * 14, bb = Math.sin(Math.PI * (cb / 100)) * 14;
    curtainPath.setAttribute('d', `M0 ${ct} C30 ${ct - bt} 70 ${ct - bt} 100 ${ct} V${cb} C70 ${cb + bb} 30 ${cb + bb} 0 ${cb}Z`);
  };
  // The button is an ordinary link. With motion on, the curtain rises first and the page follows.
  cardCta.addEventListener('click', (e) => {
    if (!hasGsap || reduced || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = cardCta.href;
    curtainPath.style.fill = ACTS[+cardCta.dataset.open].card.accent;
    curtain.top = 100; curtain.bottom = 100;
    gsap.to(curtain, { top: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: drawCurtain, onComplete: () => { location.href = href; } });
  });
  // the browser's Back button can bring this page back exactly as it was left: lift the curtain again
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    curtain.top = 100; curtain.bottom = 100; drawCurtain();
  });

  /* ---------- language ---------- */
  addEventListener('languagechange', () => {
    if (state.tl) state.tl.progress(1);
    layout();                                            // the tall card fits the longest new text
    writeCard(state.index);
    markCurrent(state.index);
    requestAnimationFrame(() => moveInk(target(), false));
  });

  /* ---------- start ---------- */
  // deep links (#quiz, #password, #passphrase, #keychain) open that activity directly;
  // the keychain scene also answers to its artwork's name, #sticker
  const hash = location.hash.slice(1);
  const fromHash = ACTS.findIndex((a) => a.key === hash || a.art === hash);
  state.index = fromHash > 0 ? fromHash : 0;
  layout();
  showStatic(state.index);                               // the first activity simply appears
  if (document.fonts) document.fonts.ready.then(() => { layout(); moveInk(target(), false); });

  function enterWorld(entrance) {
    document.body.classList.remove('is-intro');
    layout();
    moveInk(target(), false);
    if (!entrance || !hasGsap || reduced) return;
    gsap.from('.card-slot', { opacity: 0, y: 26, duration: 0.8, ease: 'expo.out', clearProps: 'all' });
    gsap.from('.il-header', { opacity: 0, y: -12, duration: 0.8, ease: 'expo.out', delay: 0.15, clearProps: 'all' });
  }

  // The intro plays once per visit, so coming back from an activity goes straight to the scenes
  let introSeen = false;
  try {
    introSeen = sessionStorage.getItem('thinksecure-intro') === 'seen';
    sessionStorage.setItem('thinksecure-intro', 'seen');
  } catch (e) { /* storage unavailable: just play it */ }

  if (!hasGsap || reduced || introSeen || /[?&]skip/.test(location.search)) {
    enterWorld(false);
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
      .add(() => enterWorld(true));
    const skip = () => { if (intro.progress() < 0.85) intro.progress(1); };
    document.getElementById('intro').addEventListener('click', skip);
    addEventListener('keydown', function k() { skip(); removeEventListener('keydown', k); });
  }
})();
