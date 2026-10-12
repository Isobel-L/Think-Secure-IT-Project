// Adapter: Tommy's articulated rig speaks through the existing six-language guidance.
(() => {
  const host = document.querySelector('.security-helper');
  const api = window.ThinkSecureMascot;
  if (!host || !api || !window.ThinkSecureMascotArt) return;
  document.querySelector('.challenge-card')?.after(host);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  api.SETTINGS.reduced = motion.matches;
  api.SETTINGS.intensity = .65;
  api.SETTINGS.fidgets = false;
  const model = document.createElement('span'); model.className = 'helper-model';
  model.innerHTML = window.ThinkSecureMascotArt;
  const svg = model.querySelector('svg');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.removeAttribute('aria-labelledby'); svg.removeAttribute('role');
  host.querySelector('.helper-launch').prepend(model);
  // Geometry needs a visible SVG when the runtime measures joints.
  host.classList.add('has-animated-model');
  const mascot = new api.Mascot(svg);
  window.guidanceMascot = mascot;
  let state, lastVisible = false;
  function sync() {
    const next = host.dataset.state;
    if (next !== state) {
      state = next;
      if (next === 'robot') mascot.play(motion.matches ? 'idle' : 'wave');
      else if (next === 'speech') mascot.play('listen');
      else {mascot.reset(); mascot.clearPointerLook();}
    }
    if (document.hidden || !lastVisible) mascot.pause(); else mascot.resume();
  }
  const intersection = new IntersectionObserver(entries => {
    lastVisible = entries[0].isIntersecting; sync();
  });
  intersection.observe(host);
  const observer = new MutationObserver(sync);
  observer.observe(host, {attributes: true, attributeFilter: ['data-state', 'hidden']});
  document.addEventListener('pointermove', event => {
    if (!motion.matches && lastVisible && !document.hidden && event.pointerType === 'mouse') mascot.lookAtClient(event.clientX, event.clientY);
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', () => mascot.clearPointerLook());
  document.addEventListener('visibilitychange', sync);
  host.querySelector('.helper-next').addEventListener('click', () => {mascot.play(motion.matches ? 'listen' : 'nudge');});
  motion.addEventListener('change', () => {
    mascot.setReducedMotion(motion.matches); mascot.clearPointerLook(); mascot.reset();
    state = undefined; sync();
  });
  window.addEventListener('pagehide', () => {mascot.pause();});
  window.addEventListener('pageshow', sync);
  sync();
})();
