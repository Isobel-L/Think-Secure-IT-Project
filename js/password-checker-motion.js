// Motion is decorative: real scores appear immediately and are never delayed.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let effects = [], scanTimer;
  const bot = document.querySelector('.cracker-area');
  const form = document.querySelector('#passwordForm');
  function animate(el, frames, options) {
    if (!el || reduced.matches || !el.animate) return;
    const effect = el.animate(frames, options);
    effects.push(effect);
    effect.finished.catch(() => {}).finally(() => {effects = effects.filter(a => a !== effect);});
  }
  const entrance = [
    ['.il-header', 0, -12], ['.intro-copy', 80, 20], ['.hero-emblem', 160, 22],
    ['.cracker-area', 220, 24], ['.checker-workspace', 300, 24]
  ];
  for (const [selector, delay, y] of entrance) animate(document.querySelector(selector),
    [{opacity: 0, transform: `translateY(${y}px)`}, {opacity: 1, transform: 'translateY(0)'}],
    {duration: 650, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards'});
  const cards = document.querySelectorAll('.education-grid article');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      animate(entry.target, [{opacity: .2, transform: 'translateY(22px)'}, {opacity: 1, transform: 'none'}], {duration: 550, easing: 'ease-out'});
      observer.unobserve(entry.target);
    }
  }, {threshold: .15});
  cards.forEach(card => observer.observe(card));
  function stop() {
    clearTimeout(scanTimer); bot.classList.remove('is-scanning');
    effects.forEach(effect => effect.cancel()); effects = [];
  }
  form.addEventListener('submit', () => {
    stop();
    if (!document.querySelector('#passwordInput').value || typeof zxcvbn !== 'function' || reduced.matches) return;
    bot.classList.add('is-scanning');
    scanTimer = setTimeout(() => bot.classList.remove('is-scanning'), 900);
    const result = document.querySelector('#resultPanel');
    animate(result, [{opacity: .45, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 380, easing: 'ease-out'});
    const meter = result.querySelector('.meter-fill');
    if (meter) animate(meter, [{width: '0%'}, {width: meter.style.width}], {duration: 650, easing: 'cubic-bezier(.2,.75,.25,1)'});
  });
  document.querySelector('#passwordInput').addEventListener('input', stop);
  document.querySelector('#clearButton').addEventListener('click', stop);
  window.addEventListener('languagechange', stop);
  reduced.addEventListener('change', () => {if (reduced.matches) stop();});
  window.addEventListener('pagehide', () => {stop(); observer.disconnect();});
})();
