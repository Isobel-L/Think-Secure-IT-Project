/* ThinkSecure shared navigation — loaded in the <head> of the home page and every activity
 *
 *  1. The logo's "SECURE" and the page-to-page curtain take the colour of the activity you are on,
 *     the same colour its title card uses on the home page.
 *  2. The activity pages get the home page's sliding highlight behind the current stop. Choosing
 *     another stop slides the highlight there before the page changes.
 *  3. Going between pages, a curtain in the destination's colour rises over the whole page,
 *     header and all, and the next page opens under the same curtain and lifts it.
 *     The curtain's colour is handed over in sessionStorage.
 * With reduced motion the links simply change page.
 */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]reduced/.test(location.search);
  const STORE = 'thinksecure-curtain';

  // each activity's colour, matching its home title card (js/home.js)
  const ACCENT = { quiz: '#FC2A12', password: '#0064FE', passphrase: '#008FBD', keychain: '#5800F5' };
  const PAGES = { 'cyber-quiz.html': 'quiz', 'password-checker.html': 'password', 'passphrase-maker.html': 'passphrase', 'sticker-generator.html': 'keychain' };
  const HASHES = { quiz: 'quiz', password: 'password', passphrase: 'passphrase', keychain: 'keychain', sticker: 'keychain' };

  const fileOf = (url) => url.pathname.split('/').pop() || 'index.html';
  const isHome = (url) => fileOf(url) === 'index.html';
  // the activity a link leads to: its page, or the scene the home page opens on
  function actOf(url) {
    if (isHome(url)) return HASHES[url.hash.slice(1)] || 'quiz';
    return PAGES[fileOf(url)];
  }

  const here = new URL(location.href);
  const hereAct = PAGES[fileOf(here)];
  if (hereAct) root.style.setProperty('--ts-brand', ACCENT[hereAct]);

  // arriving under a curtain: cover the page before its first paint (css/site-header.css)
  let arriving = null;
  try { arriving = sessionStorage.getItem(STORE); sessionStorage.removeItem(STORE); } catch (e) { /* storage unavailable */ }
  if (arriving && !reduced) {
    root.style.setProperty('--ts-curtain', arriving);
    root.classList.add('ts-arriving');
  }


  /* ---------- the curtain ---------- */
  // one SVG shape between a top and a bottom edge (0–100), each bowing a little as it travels
  let curtainEl = null, curtainPath = null;
  function curtain(color) {
    if (!curtainEl) {
      curtainEl = document.createElement('div');
      curtainEl.className = 'ts-curtain';
      curtainEl.setAttribute('aria-hidden', 'true');
      curtainEl.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100 H100 V100 H0Z"/></svg>';
      curtainPath = curtainEl.querySelector('path');
      document.body.appendChild(curtainEl);
    }
    curtainPath.style.fill = color;
    return curtainEl;
  }
  function draw(ct, cb) {
    const bt = Math.sin(Math.PI * (1 - ct / 100)) * 14, bb = Math.sin(Math.PI * (cb / 100)) * 14;
    curtainPath.setAttribute('d', `M0 ${ct} C30 ${ct - bt} 70 ${ct - bt} 100 ${ct} V${cb} C70 ${cb + bb} 30 ${cb + bb} 0 ${cb}Z`);
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // power3.inOut
  function tween(ms, step, done) {
    const start = performance.now();
    requestAnimationFrame(function frame(now) {
      const t = Math.min(1, (now - start) / ms);
      step(ease(t));
      if (t < 1) requestAnimationFrame(frame); else if (done) done();
    });
  }

  // rise over the page from the bottom, then go
  let leaving = false;
  function leave(href, color) {
    if (reduced) { location.href = href; return; }
    if (leaving) return;
    leaving = true;
    curtain(color);
    tween(600, (p) => draw(100 - 100 * p, 100), () => {
      try { sessionStorage.setItem(STORE, color); } catch (e) { /* the next page just appears */ }
      location.href = href;
    });
  }

  // keep rising off the top, uncovering the new page from the bottom up
  function arrive() {
    curtain(arriving);
    draw(0, 100);
    root.classList.remove('ts-arriving');
    const go = () => tween(700, (p) => draw(0, 100 - 100 * p), () => draw(100, 100));
    // a moment for the fonts so the page does not shift as it is revealed
    const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]) : Promise.resolve();
    fonts.then(() => requestAnimationFrame(go));
  }

  // the Back button can bring a page back exactly as it was left: under a raised curtain
  addEventListener('pageshow', (e) => {
    if (!e.persisted || !curtainEl) return;
    leaving = false;
    draw(100, 100);
    resetInk();
  });

  window.SiteNav = { leave, accentOf: (href) => ACCENT[actOf(new URL(href, location.href))] };


  /* ---------- the sliding highlight (activity pages; the home page drives its own) ---------- */
  let nav = null, ink = null, startStop = null;
  function placeInk(stop, animate) {
    if (!ink || !stop) return;
    if (!animate) ink.style.transition = 'none';
    Object.entries({ '--ink-x': `${stop.offsetLeft}px`, '--ink-y': `${stop.offsetTop}px`, '--ink-w': `${stop.offsetWidth}px`, '--ink-h': `${stop.offsetHeight}px` })
      .forEach(([k, v]) => ink.style.setProperty(k, v));
    if (!animate) { ink.getBoundingClientRect(); ink.style.transition = ''; }
  }
  const currentStop = () => nav && nav.querySelector('.il-stop[aria-current="page"]');
  function markStop(stop) {
    nav.querySelectorAll('.il-stop').forEach((s) => (s === stop ? s.setAttribute('aria-current', 'page') : s.removeAttribute('aria-current')));
  }
  function resetInk() {
    if (!ink || !startStop) return;
    markStop(startStop);
    placeInk(startStop, false);
  }

  function setUpInk() {
    nav = document.querySelector('.il-header .il-nav');
    if (!nav || nav.querySelector('.il-ink')) return;            // the home page has its own
    startStop = currentStop();
    if (!startStop) return;
    ink = document.createElement('span');
    ink.className = 'il-ink';
    ink.setAttribute('aria-hidden', 'true');
    nav.prepend(ink);
    nav.classList.add('has-ink');
    placeInk(startStop, false);
    const settle = () => placeInk(currentStop(), false);
    addEventListener('resize', settle);
    addEventListener('languagechange', () => requestAnimationFrame(settle));   // the labels change width
    if (document.fonts) document.fonts.ready.then(settle);
  }


  /* ---------- links between the pages ---------- */
  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== here.origin) return;
    const act = actOf(url);
    if (!act) return;                                            // not one of the five pages
    if (fileOf(url) === fileOf(here) && url.search === here.search) return;   // same page (or just a #section)
    e.preventDefault();
    // a stop in the navigation: the highlight goes there first
    const stop = a.closest('.il-nav .il-stop');
    if (stop && ink) { markStop(stop); placeInk(stop, true); }
    leave(url.href, ACCENT[act]);
  }

  function ready() {
    setUpInk();
    document.addEventListener('click', onClick);
    if (arriving && !reduced) arrive();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
