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

  // put a fresh <g> where `el` is and `el` inside it; GSAP animates the <g>, the drawing keeps its own transform
  function wrap(el) {
    const g = document.createElementNS(NS, 'g');
    el.replaceWith(g); g.appendChild(el);
    return g;
  }

  /* ---------- life: each drawing keeps moving a little while it is on screen ---------- */
  // The parts are tagged by tools/bundle-scenes.mjs from their layer names. One paused timeline
  // per scene; only the scene(s) on screen play theirs.
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  function buildLife(s) {
    const tl = gsap.timeline({ paused: true });
    const find = (tag) => [s.back.svg, s.front.svg].flatMap((svg) => [...svg.querySelectorAll(`[data-ts="${tag}"]`)]);
    const byX = (gs) => gs.sort((p, q) => p.getBBox().x - q.getBBox().x);

    // clouds drift, trees lean in the breeze, sparks twinkle
    find('cloud').map(wrap).forEach((g, k) => {
      tl.to(g, { x: (k % 2 ? -1 : 1) * rand(40, 80), duration: rand(5.5, 8.5), ease: 'sine.inOut', yoyo: true, repeat: -1 }, rand(0, 1.5));
    });
    find('sway').map(wrap).forEach((g) => {
      gsap.set(g, { transformOrigin: '50% 100%' });
      tl.fromTo(g, { rotation: -1.8 }, { rotation: 1.8, duration: rand(2.4, 3.4), ease: 'sine.inOut', yoyo: true, repeat: -1 }, rand(0, 1.5));
    });
    find('spark').map(wrap).forEach((g, k) => {
      gsap.set(g, { transformOrigin: '50% 50%' });
      tl.fromTo(g, { scale: 0.55, rotation: -14 }, { scale: 1.15, rotation: 14, duration: rand(0.8, 1.3), ease: 'sine.inOut', yoyo: true, repeat: -1 }, k * 0.35);
    });

    // the scam alert on the phone pings now and then
    find('alert').map(wrap).forEach((g) => {
      gsap.set(g, { transformOrigin: '50% 50%' });
      tl.add(gsap.timeline({ repeat: -1, repeatDelay: 2.2 })
        .to(g, { scale: 1.18, duration: 0.16, ease: 'power2.out' })
        .to(g, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' }), 0.8);
    });

    // eyes: an outer <g> glances towards the pointer, an inner one blinks.
    // The mascot blinks on its own rhythm, the people on another.
    const eyes = find('eye').map((e) => ({ blink: wrap(e), bot: !!e.closest('[data-ts="mascot"]') }));
    s.looks = eyes.map((e) => wrap(e.blink));
    [true, false].forEach((bot) => {
      const lids = eyes.filter((e) => e.bot === bot).map((e) => e.blink);
      if (!lids.length) return;
      gsap.set(lids, { transformOrigin: '50% 50%' });
      tl.add(gsap.timeline({ repeat: -1, repeatDelay: bot ? 3.1 : 4.3 })
        .to(lids, { scaleY: 0.1, duration: 0.07, ease: 'power1.in' })
        .to(lids, { scaleY: 1, duration: 0.13, ease: 'power1.out' }), bot ? 1.2 : 2.6);
    });

    // the mascot floats gently
    if (s.bobs.length) tl.to(s.bobs, { y: -9, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);

    // the password checker types a password and its strength meter fills, then starts over
    const dots = byX(find('pw-dot').map(wrap)), bars = byX(find('meter').map(wrap));
    if (dots.length) {
      gsap.set(dots, { transformOrigin: '50% 50%' });
      gsap.set(bars, { transformOrigin: '0% 50%' });
      tl.add(gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
        .set(dots, { opacity: 0 })
        .set(bars, { scaleX: 0 })
        .fromTo(dots, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.17 }, 0.5)
        .to(bars, { scaleX: 1, duration: 0.35, ease: 'power2.out', stagger: 0.22 }, '>-0.15')
        .to(dots, { opacity: 0, duration: 0.2, stagger: { each: 0.04, from: 'end' } }, '+=2.4')
        .to(bars, { scaleX: 0, duration: 0.3, ease: 'power2.in' }, '<'), 0);
    }
    return tl;
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
    // the mascot gets wrappers, so it can be animated without touching the drawing:
    // rig (nudged between scenes) > hop (when poked) > bob (idle float) > the drawing
    const bobs = [...front.svg.querySelectorAll('[data-ts="mascot"]')].map(wrap);
    const hops = bobs.map(wrap);
    const rigs = hops.map(wrap);
    rigs.forEach((g) => g.classList.add('ts-poke'));
    return { a, back, front, rigs, hops, bobs, looks: [], life: null, centre: null };
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
    if (hasGsap && !reduced) s.life = buildLife(s);
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
    scenes.forEach((s, k) => { if (s.life) (k === i ? s.life.restart() : s.life.pause()); });
    writeCard(i);
    markCurrent(i);
    applyTheme(i);
    moveInk(i, false);
  }

  function finish(from) {
    const A = scenes[from], B = scenes[state.index];
    [A.back.el, A.front.el].forEach((el) => el.classList.remove('is-on'));
    if (A.life && A !== B) A.life.pause();
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
    hush();
    dir = dir || Math.sign(wrapDelta(to - from)) || 1;
    markCurrent(to);
    moveInk(to, true);
    if (!hasGsap) { showStatic(to); return; }

    state.busy = true;
    const A = scenes[from], B = scenes[to];
    // the incoming scene lies on top of the outgoing one, in both planes
    zTop += 1;
    [B.back.el, B.front.el].forEach((el) => { el.classList.add('is-on'); el.style.zIndex = String(zTop); });
    if (B.life) B.life.restart();
    // the card stops leaning towards the pointer while it turns
    tilt.x = tilt.y = tilt.tx = tilt.ty = 0;
    gsap.set(card, { rotationY: 0 });
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
    else if (Math.hypot(dx, dy) < 8 && !e.target.closest('.card, .ts-poke')) burst(e.clientX, e.clientY);
  });

  /* ---------- the pointer: depth between the planes, a glance from the eyes, a tilt of the card ---------- */
  const parallax = hasGsap && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.dataset.motion = hasGsap && !reduced ? 'full' : 'reduced';
  root.toggleAttribute('data-parallax', parallax);
  const look = { x: 0, y: 0, tx: 0, ty: 0 };           // pointer from the screen centre, -1…1
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };           // card lean, degrees
  let raf = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function frame() {
    raf = 0;
    let moving = false;
    [look, tilt].forEach((o) => {
      o.x += (o.tx - o.x) * 0.08; o.y += (o.ty - o.y) * 0.08;
      if (Math.abs(o.tx - o.x) + Math.abs(o.ty - o.y) > 0.002) moving = true;
      else { o.x = o.tx; o.y = o.ty; }
    });
    // the planes move against the pointer (see css), the front one the furthest
    root.style.setProperty('--px', look.x.toFixed(4));
    root.style.setProperty('--py', look.y.toFixed(4));
    scenes[state.index].looks.forEach((g) => gsap.set(g, { x: look.x * 2.2, y: look.y * 1.6 }));
    if (!state.busy) gsap.set(card, { rotationY: tilt.x, rotationX: tilt.y });
    if (moving) kick();
  }
  if (parallax) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || locked()) return;
      look.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      look.ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      kick();
    }, { passive: true });
    document.addEventListener('mouseleave', () => { look.tx = look.ty = 0; kick(); });
    // the card leans away from the pointer and a soft light follows it across
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || state.busy) return;
      const r = card.getBoundingClientRect();
      const mx = clamp((e.clientX - r.left) / r.width, 0, 1), my = clamp((e.clientY - r.top) / r.height, 0, 1);
      card.style.setProperty('--mx', `${(mx * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(my * 100).toFixed(1)}%`);
      tilt.tx = (mx - 0.5) * (wide ? 5 : 3);
      tilt.ty = (0.5 - my) * (wide ? 4 : 2.5);
      kick();
    });
    card.addEventListener('pointerleave', () => { tilt.tx = tilt.ty = 0; kick(); });
  }

  /* ---------- the mascot: poke it for a hop and a safety tip ---------- */
  const bubble = document.getElementById('botBubble');
  const bubbleText = document.getElementById('botBubbleText');
  const TIPS = 3;
  const told = {};                                     // the next tip for each activity
  let bubbleTimer = 0, poked = false;
  function hop(s) {
    if (!hasGsap || reduced || !s.hops.length) return;
    gsap.killTweensOf(s.hops);
    gsap.timeline()
      .to(s.hops, { scaleX: 1.07, scaleY: 0.9, transformOrigin: '50% 100%', duration: 0.1, ease: 'power2.in' })
      .to(s.hops, { y: -44, scaleX: 0.96, scaleY: 1.06, duration: 0.24, ease: 'power2.out' })
      .to(s.hops, { y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: 'bounce.out' });
  }
  function poke(hint) {
    const s = scenes[state.index];
    if (state.busy || !s.rigs.length) return;
    hop(s);
    if (hint) { say(t('home.bot.hint')); return; }
    poked = true;
    const k = told[s.a.key] || 0;
    told[s.a.key] = (k + 1) % TIPS;
    say(t(`home.bot.${s.a.key}.${k + 1}`));
  }
  function say(text) {
    bubbleText.textContent = text;
    placeBubble();
    bubble.classList.remove('is-on');
    bubble.getBoundingClientRect();                    // restart the pop when the words change
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hush, 3800 + text.length * 35);
  }
  function hush() {
    clearTimeout(bubbleTimer);
    bubble.classList.remove('is-on');
  }
  // above the mascot's head, kept on screen; below it when the header is in the way
  function placeBubble() {
    const rs = scenes[state.index].rigs.map((g) => g.getBoundingClientRect()).filter((r) => r.width);
    if (!rs.length) return;
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    const cx = (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2;
    const w = bubble.offsetWidth, h = bubble.offsetHeight, m = 12;
    const below = top - h - 18 < header.getBoundingClientRect().bottom + m;
    const left = clamp(cx, m + w / 2, innerWidth - m - w / 2);
    bubble.classList.toggle('is-below', below);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${below ? Math.min(bottom + 14, innerHeight - h - m) : top - 14}px`;
    bubble.style.setProperty('--tail-x', `${clamp(cx - left, -w / 2 + 24, w / 2 - 24)}px`);
  }
  addEventListener('click', (e) => { if (!locked() && e.target.closest('.ts-poke')) poke(false); });

  /* ---------- a little burst of sparkles wherever the illustration is tapped ---------- */
  const fx = document.getElementById('fx');
  function burst(x, y) {
    if (!hasGsap || reduced || locked()) return;
    const a = ACTS[state.index];
    const colours = [a.card.accent, '#FCC237', a.ground, '#03A18B'];
    for (let k = 0; k < 10; k++) {
      const bit = document.createElement('i');
      bit.className = k % 2 ? 'fx-bit' : 'fx-bit is-star';
      bit.style.cssText = `left:${x}px;top:${y}px;color:${colours[k % colours.length]}`;
      fx.appendChild(bit);
      const ang = (k / 10) * Math.PI * 2 + rand(-0.3, 0.3), d = rand(34, 86);
      gsap.fromTo(bit, { scale: rand(0.7, 1.2) }, {
        x: Math.cos(ang) * d, y: Math.sin(ang) * d - 12, rotation: rand(-200, 200), scale: 0,
        duration: rand(0.6, 0.95), ease: 'power3.out', onComplete: () => bit.remove(),
      });
    }
  }

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (state.tl) state.tl.progress(1);
      hush();
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
    hush();
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
    inviteToPoke();
    if (!entrance || !hasGsap || reduced) return;
    gsap.from('.card-slot', { opacity: 0, y: 26, duration: 0.8, ease: 'expo.out', clearProps: 'all' });
    gsap.from('.il-header', { opacity: 0, y: -12, duration: 0.8, ease: 'expo.out', delay: 0.15, clearProps: 'all' });
  }

  // once per visit, the mascot hops and asks to be poked, unless someone already found it
  function inviteToPoke() {
    try {
      if (sessionStorage.getItem('thinksecure-bot-hint') === 'seen') return;
      sessionStorage.setItem('thinksecure-bot-hint', 'seen');
    } catch (e) { /* storage unavailable: invite anyway */ }
    setTimeout(() => { if (!poked && !locked()) poke(true); }, 2600);
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
