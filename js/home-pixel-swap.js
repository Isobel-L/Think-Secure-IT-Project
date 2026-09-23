// Native HTML adaptation of the user-provided React Bits PixelSwap reference.
// Each tile clips a copy of the incoming face. Shared controls never get cloned.
(() => {
  const home = document.querySelector('.start-screen');
  const card = home?.querySelector('.start-card');
  if (!card) return;
  const labels = {
    en: ['Explore ThinkSecure', 'Show the logo'],
    'zh-CN': ['了解 ThinkSecure', '显示品牌标志'],
    'zh-TW': ['認識 ThinkSecure', '顯示品牌標誌'],
    vi: ['Khám phá ThinkSecure', 'Hiện logo'],
    fr: ['Découvrir ThinkSecure', 'Afficher le logo'],
    de: ['ThinkSecure entdecken', 'Logo anzeigen']
  };
  const controls = document.createElement('div'); controls.className = 'home-controls';
  controls.append(card.querySelector('.start-button'), card.querySelector('.start-duration'));
  const logo = document.createElement('div'); logo.className = 'home-face home-face-logo';
  logo.innerHTML = '<div class="home-face-content"><img class="home-logo" src="Images/thinksecure-logo.png" alt="Think Secure" width="1088" height="832"></div>';
  const original = document.createElement('div'); original.className = 'home-face home-face-original';
  const content = document.createElement('div'); content.className = 'home-face-content'; content.append(card); original.append(content);
  const zone = document.createElement('div'); zone.className = 'home-hover-zone'; zone.tabIndex = 0; zone.setAttribute('role', 'button');
  const grid = document.createElement('div'); grid.className = 'home-pixels'; grid.setAttribute('aria-hidden', 'true'); grid.inert = true;
  home.prepend(logo, original, grid, zone, controls); home.classList.add('pixel-home');
  const faces = [logo, original], motion = matchMedia('(prefers-reduced-motion: reduce)');
  let shown = 0, desired = 0, running = false, animations = [], timer = 0;
  function translate() {
    const copy = labels[window.I18n?.getLanguage()] || labels.en;
    zone.setAttribute('aria-label', copy[desired ? 1 : 0]);
  }
  function show(index) {
    shown = index; home.dataset.face = index ? 'welcome' : 'logo';
    faces.forEach((face, i) => face.setAttribute('aria-hidden', String(i !== index)));
  }
  function clear() {
    clearTimeout(timer); animations.forEach(a => a.cancel()); animations = []; grid.replaceChildren(); running = false;
    home.dataset.transitioning = 'false';
  }
  function settle() { clear(); show(desired); }
  function swap(index) {
    desired = index; translate();
    if (running || shown === desired) return;
    if (motion.matches || !Element.prototype.animate) { show(desired); return; }
    running = true; home.dataset.transitioning = 'true';
    const target = desired, width = home.clientWidth, height = home.clientHeight;
    let size = 72;
    while (Math.ceil(width / size) * Math.ceil(height / size) > 220) size += 4;
    const fragment = document.createDocumentFragment(), pending = [];
    for (let y = 0; y < height; y += size) for (let x = 0; x < width; x += size) {
      const tile = document.createElement('div'); tile.className = 'home-pixel';
      Object.assign(tile.style, {left: x+'px', top: y+'px', width: size+'px', height: size+'px'});
      const view = document.createElement('div'); view.className = 'home-pixel-content';
      Object.assign(view.style, {left: -x+'px', top: -y+'px', width: width+'px', height: height+'px'});
      const clone = faces[target].cloneNode(true); clone.removeAttribute('aria-hidden');
      // Decorative snapshots must not duplicate semantic IDs or translation targets.
      clone.querySelectorAll('*').forEach(el => {el.removeAttribute('id'); el.removeAttribute('data-i18n');});
      view.append(clone); tile.append(view); fragment.append(tile); pending.push(tile);
    }
    grid.append(fragment);
    for (const tile of pending) animations.push(tile.animate([
      {clipPath: 'inset(32.5%)', opacity: 0},
      {clipPath: 'inset(0%)', opacity: 1}
    ], {duration: 450, delay: Math.random()*950, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'both'}));
    timer = setTimeout(() => {clear(); show(target); if (desired !== shown) swap(desired);}, 1400);
  }
  zone.addEventListener('pointerenter', e => {if (e.pointerType === 'mouse') swap(1);});
  zone.addEventListener('pointerleave', e => {if (e.pointerType === 'mouse') swap(0);});
  zone.addEventListener('click', e => {if (e.pointerType !== 'mouse') swap(1-desired);});
  zone.addEventListener('keydown', e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); swap(1-desired);}});
  window.addEventListener('languagechange', () => {settle(); translate();});
  new ResizeObserver(() => {if (running) settle();}).observe(home);
  motion.addEventListener('change', () => {if (motion.matches) settle();});
  window.addEventListener('pagehide', settle);
  logo.querySelector('img').addEventListener('error', () => {settle(); show(1); desired=1; zone.remove();});
  show(0); translate();
})();
