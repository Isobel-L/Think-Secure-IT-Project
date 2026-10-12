// Password Checker score choreography. Scoring and translated feedback remain immediate.
(() => {
  const api = window.ThinkSecureMascot;
  const area = document.querySelector('.cracker-area');
  const image = document.querySelector('#robotImage');
  if (!api || !area || !image || !window.ThinkSecureMascotArt) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const container = document.createElement('div');
  container.className = 'score-model';
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = window.ThinkSecureMascotArt;
  const svg = container.querySelector('svg');
  // Namespace both IDs and paint/clip/use references. The guidance rig is independent.
  const ids = new Map();
  for (const node of [svg, ...svg.querySelectorAll('[id]')]) {
    if (!node.id) continue;
    const original = node.id;
    ids.set(original, 'score-' + original);
    node.dataset.rigId = original;
    node.id = 'score-' + original;
  }
  for (const node of [svg, ...svg.querySelectorAll('*')]) {
    for (const attr of [...node.attributes]) {
      if (attr.name === 'id' || attr.name === 'data-rig-id') continue;
      let value = attr.value.replace(/url\(#([^\)]+)\)/g, (all, id) => ids.has(id) ? `url(#${ids.get(id)})` : all);
      if (value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
      if (value !== attr.value) node.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
  }
  svg.removeAttribute('aria-labelledby');
  svg.removeAttribute('role');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 -160 600 880'); // Headroom for the raised fist at the jump apex.
  const mood = document.createElement('span');
  mood.className = 'score-mood';
  mood.innerHTML = '<svg viewBox="0 0 200 110" aria-hidden="true"><g class="gloom-ring"><ellipse cx="100" cy="28" rx="49" ry="12"/><ellipse cx="100" cy="28" rx="35" ry="8"/></g><g class="gloom-streaks"><path d="M62 53v26"/><path d="M99 59v32"/><path d="M136 53v26"/></g></svg>';
  container.append(mood);
  image.after(container);
  const arm = (side, upper, fore, hand) => ({
    ['upper_arm_' + side]: {r: upper}, ['forearm_' + side]: {r: fore}, ['hand_' + side]: {r: hand}
  });
  // Five distinct emotional silhouettes; the victory jump runs once per check.
  api.EXPRESSIONS.score_ready = {mouth: 'flat', cheeks: .2};
  api.EXPRESSIONS.score_deflated = {mouth: 'frown', lid: [.67, -24, .1], brow: [1, 9, -28], cheeks: 0, dim: .32, eyeY: 9, faceY: 9};
  api.EXPRESSIONS.score_low = {mouth: 'frown', lid: [.36, -17, .04], brow: [.9, 0, -18], cheeks: .1, dim: .12, eyeY: 4};
  api.EXPRESSIONS.score_shrug = {mouth: 'flat', lid: [.15, 0, 0], brow: [.8, -10, -6], cheeks: .35};
  const poses = {
    ready: {face: 'score_ready', pose: {}, hands: {L: 'relaxed', R: 'relaxed'}},
    checking: {face: 'thinking', pose: {head: {r: 5}, ...arm('R', -42, -112, 0)}, hands: {L: 'relaxed', R: 'fist'}},
    0: {face: 'score_deflated', pose: {hip: {y: 65}, spine: {sy: .85}, chest: {y: 13}, head: {r: -13, y: 23}, neck: {y: 9}, shoulder_L: {y: 16}, shoulder_R: {y: 16}, antenna_1: {r: 27}, hat: {r: -5, y: 4}, ikL: {x: 12}, ikR: {x: 12}, ...arm('L', 3, -4, -10), ...arm('R', 3, -4, -10)}, hands: {L: 'relaxed', R: 'relaxed'}},
    1: {face: 'score_low', pose: {hip: {y: 7}, spine: {sy: .96, r: -3}, head: {r: -8, y: 13}, shoulder_L: {y: 8}, shoulder_R: {y: 8}, antenna_1: {r: 14}, ...arm('L', 7, -8, -5), ...arm('R', 7, -8, -5)}, hands: {L: 'relaxed', R: 'relaxed'}},
    2: {face: 'score_shrug', pose: {head: {r: 8}, shoulder_L: {y: -13}, shoulder_R: {y: -13}, ...arm('L', 34, 65, 24), ...arm('R', 34, 65, 24)}, hands: {L: 'open', R: 'open'}},
    3: {face: 'happy', pose: {head: {r: -3, y: -6}, chest: {y: -5}, spine: {sy: 1.03}, ...arm('L', 38, 108, 18), ...arm('R', 38, 108, 18)}, hands: {L: 'thumbs', R: 'thumbs'}},
    4: {face: 'excited', pose: {head: {r: -5, y: -6}, chest: {y: -4}, spine: {r: -3}, ...arm('L', 135, 18, 0), ...arm('R', 45, -90, -8)}, hands: {L: 'fist', R: 'fist'}}
  };
  for (const [name, spec] of Object.entries(poses)) {
    const final = {at: 80, abs: true, pose: spec.pose, hands: spec.hands, order: {L: 'front', R: 'front'}};
    api.STATES['score_' + name] = {
      label: 'Score ' + name, loop: true, spring: Number(name) >= 3 ? 'bouncy' : 'gentle', lead: 0,
      steps: [{at: 0, face: spec.face, look: name === 'checking' ? [.2, -.2] : Number(name) <= 1 ? [0, .6] : [0, 0]}, final,
        {at: 620, abs: true, pose: {head: {y: (spec.pose.head?.y || 0) + (Number(name) >= 3 ? 10 : 3)}}},
        {at: 1050, abs: true, pose: {head: {y: spec.pose.head?.y || 0}}}],
      reducedSteps: [{...final, at: 0, face: spec.face, look: [0, 0]}],
      proc(t, add) {
        if (reduced.matches) return;
        add('spine.sy', (name === '0' ? .016 : .008) * Math.sin(t / 550));
        add('head.y', (name === '0' ? 2.5 : .8) * Math.sin(t / 600));
      }
    };
  }
  api.STATES.score_0.steps[1] = {...api.STATES.score_0.steps[1], pose: {
    ...poses[0].pose, hip: {y: [65, 650, 'inOutSine']}, spine: {sy: [.85, 650, 'inOutSine']}, head: {r: -13, y: [23, 550, 'inOutSine']}
  }};
  // A single asymmetric superhero leap, landing, then a held victory silhouette.
  api.STATES.score_4.steps = [
    {at: 0, face: 'excited', look: [0, -.35], hands: {L: 'fist', R: 'fist'}, order: {L: 'front', R: 'front'}},
    {at: 40, abs: true, spring: 'snappy', pose: {hip: {y: 22}, mascot_root: {sy: .9, sx: 1.06}, head: {y: 4}, ...arm('L', 25, -48, 0), ...arm('R', 25, -48, 0)}},
    {at: 290, abs: true, spring: 'track', pose: {mascot_root: {y: [-112, 290, 'outQuad'], r: -7, sy: 1.04, sx: .98}, hip: {y: 0}, spine: {r: -4}, head: {y: -5, r: -7}, ikL: {x: 4, y: -8, r: 3}, ikR: {x: 8, y: -64, r: 23}, ...arm('L', 164, 5, 0), ...arm('R', 50, -102, -8)}},
    {at: 390, fx: [{name: 'sparkles', n: 7, y: 330, r: 160}, 'badgeShine']},
    {at: 740, abs: true, spring: 'track', pose: {mascot_root: {y: [0, 330, 'inQuad'], r: 0, sx: 1, sy: 1}, ikL: {x: 0, y: 0, r: 0}, ikR: {x: 0, y: 0, r: 0}}},
    {at: 1080, abs: true, spring: 'snappy', pose: {hip: {y: 15}, mascot_root: {sy: .94, sx: 1.04}}, fx: 'dust'},
    {at: 1270, abs: true, spring: 'default', look: [0, 0], pose: {...poses[4].pose, hip: {y: 0}, mascot_root: {x: 0, y: 0, r: 0, sx: 1, sy: 1}}}
  ];
  const mascot = new api.Mascot(svg);
  window.scoreMascot = mascot;
  area.classList.add('has-score-model');
  // The original hidden image still supplies translated alt text and fallback art.
  image.setAttribute('aria-hidden', 'true');
  let timer, visible = true, target = 'ready';
  function play(name) {
    target = name;
    mascot.play('score_' + name);
    container.dataset.pose = name;
  }
  function ready() { clearTimeout(timer); if (target !== 'ready') play('ready'); }
  function submit() {
    clearTimeout(timer);
    const score = area.dataset.score;
    if (score === undefined) { ready(); return; }
    if (reduced.matches) { play(score); return; }
    play('checking');
    timer = setTimeout(() => play(score), 600);
  }
  document.querySelector('#passwordForm').addEventListener('submit', submit);
  document.querySelector('#passwordInput').addEventListener('input', ready);
  document.querySelector('#clearButton').addEventListener('click', ready);
  // Language / breach-status re-renders deliberately do not restart the performance.
  reduced.addEventListener('change', () => {
    clearTimeout(timer);
    mascot.setReducedMotion(reduced.matches);
    play(area.dataset.score ?? 'ready');
  });
  function syncVisibility() { if (document.hidden || !visible) mascot.pause(); else mascot.resume(); }
  const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; syncVisibility();});
  observer.observe(area);
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('pagehide', () => {clearTimeout(timer); mascot.pause();});
  window.addEventListener('pageshow', () => {play(area.dataset.score ?? 'ready'); syncVisibility();});
  play(area.dataset.score ?? 'ready');
})();
