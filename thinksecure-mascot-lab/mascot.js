/*!
 * ThinkSecure Mascot — articulated SVG rig + spring-driven animation system.
 * Vanilla JS, no dependencies. Open index.html to run the Motion Lab.
 *
 * Layers (all independent, combined every frame):
 *   BODY STATE  – pose-to-pose timelines (STATES) driving spring channels
 *   FACE STATE  – expression presets (EXPRESSIONS) driving eyes / lids / brows / mouth
 *   LOOK TARGET – state look > expression look > pointer / API look > idle wander
 *   BLINK       – random blinks + "blink cuts" that hide eye-shape swaps
 *   FX          – sparkles, confetti, ! / ? marks, alert rings, dust …
 *   SECONDARY   – follow-through dynamics for hat, antenna and shoulder caps
 *   IK          – two-bone leg IK keeps the boots planted on the ground
 */
(function () {
  'use strict';

  /* ======================================================================
   * 1. Math helpers + easing
   * ==================================================================== */
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const f3 = (n) => Math.round(n * 1000) / 1000;

  const EASE = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  // 2D affine matrices in SVG order [a b c d e f]
  const Mx = {
    local(px, py, x, y, r, sx, sy) {
      // translate(px+x, py+y) rotate(r) scale(sx, sy) translate(-px, -py)
      const c = Math.cos(r * DEG), s = Math.sin(r * DEG);
      const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
      return [a, b, cc, d, px + x - (a * px + cc * py), py + y - (b * px + d * py)];
    },
    mul(m, n) {
      return [
        m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
        m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
        m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
      ];
    },
    apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
    inv(m) {
      const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
      const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
      return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
    },
  };

  /* ======================================================================
   * 2. Global runtime settings (driven by the lab UI or the public API)
   * ==================================================================== */
  const SETTINGS = {
    speed: 1,          // 0.25 – 2
    intensity: 1,      // 0.25 (subtle) – 1.4 (expressive)
    reduced: false,    // prefers-reduced-motion
    pointerLook: true,
    fidgets: true,
  };
  // how much a spring rebounds at the current intensity
  function effZeta(z) {
    if (SETTINGS.reduced) return Math.max(z, 0.98);
    const I = SETTINGS.intensity;
    const f = I <= 1 ? 1 + (1 - I) * 1.1 : 1 / (1 + (I - 1) * 1.0);
    return clamp(z * f, 0.12, 1.25);
  }
  const squashFactor = () => (SETTINGS.reduced ? 0.12 : SETTINGS.intensity);
  const jumpFactor = () => (SETTINGS.reduced ? 0.05 : 0.75 + 0.25 * SETTINGS.intensity);
  const crouchFactor = () => (SETTINGS.reduced ? 0.35 : 0.7 + 0.3 * SETTINGS.intensity);
  const dynGain = () => (0.35 + 0.65 * SETTINGS.intensity) * (SETTINGS.reduced ? 0.25 : 1);

  /* ======================================================================
   * 3. Spring channel — every animated value is one of these
   *    target = base (pose / tween) + add (procedural layer, per frame)
   * ==================================================================== */
  class Channel {
    constructor(name, rest) {
      this.name = name;
      this.rest = rest;
      this.v = rest;
      this.vel = 0;
      this.base = rest;
      this.add = 0;
      this.k = 300;
      this.z = 0.5;
      this.tw = null;
    }
    set(target, profile, tweenMs, ease) {
      if (profile) { this.k = profile[0]; this.z = profile[1]; }
      if (tweenMs > 0) {
        this.tw = { from: this.base, to: target, t: 0, d: tweenMs, e: EASE[ease] || EASE.inOutSine };
      } else {
        this.tw = null;
        this.base = target;
      }
    }
    snap(value) { this.v = this.base = value; this.vel = 0; this.tw = null; }
    tweenStep(ms) {
      const tw = this.tw;
      if (!tw) return;
      tw.t += ms;
      const p = clamp(tw.t / tw.d, 0, 1);
      this.base = lerp(tw.from, tw.to, tw.e(p));
      if (p >= 1) this.tw = null;
    }
    step(dt) {
      const k = this.k, c = 2 * effZeta(this.z) * Math.sqrt(k);
      const a = -k * (this.v - (this.base + this.add)) - c * this.vel;
      this.vel += a * dt;
      this.v += this.vel * dt;
    }
  }

  // Simple 2nd-order follower used for secondary motion (hat / antenna lag)
  class Follower {
    constructor(k, z) { this.k = k; this.z = z; this.v = null; this.vel = 0; }
    step(target, dt) {
      if (this.v === null) { this.v = target; return 0; }
      const c = 2 * this.z * Math.sqrt(this.k);
      this.vel += (-this.k * (this.v - target) - c * this.vel) * dt;
      this.v += this.vel * dt;
      return this.v - target; // lag
    }
    reset() { this.v = null; this.vel = 0; }
  }

  /* ======================================================================
   * 4. RIG CONFIG — bone hierarchy, pivots, channels
   *    pivot = point in the PARENT's user space that the bone rotates about.
   *    kind  = core | squash | secondary | ik | face  (used by the rig overlay)
   *    lag   = ms of automatic follow-through delay when a pose is applied
   * ==================================================================== */
  const BONES = {
    mascot_root: { parent: null, pivot: [300, 708], ch: 'x y r sx sy op', kind: 'squash', lag: 0 },
    hip: { parent: 'mascot_root', pivot: [300, 548], ch: 'x y r', kind: 'core', lag: 0 },
    pelvis: { parent: 'hip', pivot: [300, 548], ch: '', kind: 'core' },

    leg_L: { parent: 'hip', pivot: [270, 550], ch: '', kind: 'ik' },
    thigh_L: { parent: 'leg_L', pivot: [0, 0], ch: 'r', kind: 'ik' },
    shin_L: { parent: 'thigh_L', pivot: [0, 0], ch: 'r', kind: 'ik' },
    foot_L: { parent: 'shin_L', pivot: [0, 0], ch: 'r', kind: 'ik' },
    leg_R: { parent: 'hip', pivot: [330, 550], ch: '', kind: 'ik' },
    thigh_R: { parent: 'leg_R', pivot: [0, 0], ch: 'r', kind: 'ik' },
    shin_R: { parent: 'thigh_R', pivot: [0, 0], ch: 'r', kind: 'ik' },
    foot_R: { parent: 'shin_R', pivot: [0, 0], ch: 'r', kind: 'ik' },

    spine: { parent: 'hip', pivot: [300, 542], ch: 'x y r sx sy', kind: 'squash', lag: 15 },
    chest: { parent: 'spine', pivot: [300, 468], ch: 'y r sx sy', kind: 'squash', lag: 30 },
    chest_badge: { parent: 'chest', pivot: [300, 450], ch: 'sx sy', kind: 'core', lag: 45 },

    shoulder_L: { parent: 'chest', pivot: [228, 420], ch: 'x y r', kind: 'core', lag: 35 },
    upper_arm_L: { parent: 'shoulder_L', pivot: [0, 0], ch: 'r', kind: 'core', lag: 35 },
    forearm_L: { parent: 'upper_arm_L', pivot: [0, 0], ch: 'r', kind: 'core', lag: 70 },
    hand_L: { parent: 'forearm_L', pivot: [0, 0], ch: 'r sx sy', kind: 'core', lag: 100 },
    shoulder_cap_L: { parent: 'shoulder_L', pivot: [-20, 2], ch: 'r', kind: 'secondary' },
    shoulder_R: { parent: 'chest', pivot: [228, 420], ch: 'x y r', kind: 'core', lag: 35 },
    upper_arm_R: { parent: 'shoulder_R', pivot: [0, 0], ch: 'r', kind: 'core', lag: 35 },
    forearm_R: { parent: 'upper_arm_R', pivot: [0, 0], ch: 'r', kind: 'core', lag: 70 },
    hand_R: { parent: 'forearm_R', pivot: [0, 0], ch: 'r sx sy', kind: 'core', lag: 100 },
    shoulder_cap_R: { parent: 'shoulder_R', pivot: [-20, 2], ch: 'r', kind: 'secondary' },

    neck: { parent: 'chest', pivot: [300, 394], ch: 'x y r', kind: 'core', lag: 50 },
    head: { parent: 'neck', pivot: [300, 382], ch: 'x y r sx sy', kind: 'squash', lag: 70 },
    face: { parent: 'head', pivot: [300, 276], ch: 'x y sx sy', kind: 'face', group: 'face' },
    eye_L: { parent: 'face', pivot: [246, 266], ch: 'x y sx sy r', kind: 'face', group: 'face' },
    eye_R: { parent: 'face', pivot: [354, 266], ch: 'x y sx sy r', kind: 'face', group: 'face' },
    brow_L: { parent: 'face', pivot: [247, 222], ch: 'y r op', kind: 'face', group: 'face' },
    brow_R: { parent: 'face', pivot: [353, 222], ch: 'y r op', kind: 'face', group: 'face' },
    mouth: { parent: 'face', pivot: [300, 324], ch: 'x y sx sy r', kind: 'face', group: 'face' },
    hat: { parent: 'head', pivot: [300, 196], ch: 'x y r sx sy', kind: 'squash', lag: 95 }, // whole hat moves as one piece
    ear_L: { parent: 'head', pivot: [152, 280], ch: 'x sx sy', kind: 'core', lag: 70 },
    ear_R: { parent: 'head', pivot: [448, 280], ch: 'x sx sy', kind: 'core', lag: 70 },
    antenna: { parent: 'head', pivot: [454, 262], ch: '', kind: 'secondary' },
    antenna_1: { parent: 'antenna', pivot: [0, 0], ch: 'r', kind: 'secondary', lag: 110 },
    antenna_2: { parent: 'antenna_1', pivot: [0, 0], ch: 'r', kind: 'secondary', lag: 140 },
    antenna_tip: { parent: 'antenna_2', pivot: [0, -12], ch: 'sx sy', kind: 'secondary', lag: 150 },
  };

  // Non-default rest values (everything else rests at 0, scale/opacity at 1)
  const REST_ARM = [16, -8, -4]; // upper, fore, hand (positive = outward / up, both sides)
  const REST = {
    'upper_arm_L.r': REST_ARM[0], 'forearm_L.r': REST_ARM[1], 'hand_L.r': REST_ARM[2],
    'upper_arm_R.r': REST_ARM[0], 'forearm_R.r': REST_ARM[1], 'hand_R.r': REST_ARM[2],
    'brow_L.op': 0, 'brow_R.op': 0,
  };

  // Extra non-bone channels: [name, rest, group]
  const EXTRA_CHANNELS = [
    ['ikL.x', 0, 'body'], ['ikL.y', 0, 'body'], ['ikL.r', 0, 'body'],
    ['ikR.x', 0, 'body'], ['ikR.y', 0, 'body'], ['ikR.r', 0, 'body'],
    ['glow.badge', 0, 'body'], ['glow.antenna', 0, 'body'], ['glow.earL', 0, 'body'], ['glow.earR', 0, 'body'],
    ['lid.topL', 0, 'face'], ['lid.angL', 0, 'face'], ['lid.botL', 0, 'face'],
    ['lid.topR', 0, 'face'], ['lid.angR', 0, 'face'], ['lid.botR', 0, 'face'],
    ['face.cheeks', 0.75, 'face'], ['face.tint', 0, 'face'], ['face.dim', 0, 'face'],
    ['look.eyeX', 0, 'look'], ['look.eyeY', 0, 'look'], ['look.headX', 0, 'look'], ['look.headY', 0, 'look'],
  ];

  // Spring profiles: [stiffness, damping ratio]
  const SPRING = {
    gentle: [150, 0.72],
    default: [320, 0.5],
    bouncy: [280, 0.32],
    snappy: [640, 0.56],
    firm: [520, 0.82],
    soft: [110, 1.0],
    track: [1300, 0.92],
    pop: [330, 0.42],
    face: [460, 0.6],
    lid: [560, 0.78],
    lookEye: [720, 0.74],
    lookHead: [70, 0.62],
  };

  /* ======================================================================
   * 5. FACE SYSTEM — expression presets
   *    eyes: round | happy | sparkle | wide | line
   *    mouth: smile | open | grin | o | flat | frown | wobble | smirk | pout | dots
   *    lid: [top 0..1, angle° (+ = inner corner down / angry), bottom 0..1]
   *    brow: [opacity, y offset, angle° (+ = angry, − = worried)]
   * ==================================================================== */
  const EXPR_DEFAULT = {
    eyes: 'round', mouth: 'smile',
    eL: [1, 1], eR: [1, 1], eyeY: 0,
    lid: [0, 0, 0], lidR: null,
    brow: [0, 0, 0], browR: null,
    cheeks: 0.75, tint: 0, dim: 0, mouthY: 0, faceY: 0,
    look: null, pulse: false,
  };
  const EXPRESSIONS = {
    neutral: {},
    happy: { eyes: 'happy', mouth: 'open', cheeks: 1, eyeY: -2 },
    excited: { eyes: 'sparkle', mouth: 'grin', eL: [1.1, 1.1], eR: [1.1, 1.1], cheeks: 1, pulse: true, eyeY: -2 },
    surprised: { eyes: 'wide', mouth: 'o', eL: [1.04, 1.1], eR: [1.04, 1.1], brow: [1, -16, -8], cheeks: 0.4, eyeY: -2 },
    thinking: { eyes: 'round', mouth: 'dots', look: [0.55, -0.7], eR: [0.96, 0.9], lidR: [0.16, 4, 0], brow: [1, -10, -12], browR: [1, -2, 6], cheeks: 0.4 },
    concerned: { eyes: 'round', mouth: 'wobble', lid: [0.24, -16, 0], brow: [1, -6, -18], cheeks: 0.35, eyeY: 2 },
    sad: { eyes: 'round', mouth: 'frown', lid: [0.4, -20, 0.08], brow: [0.9, -2, -22], look: [0, 0.55], cheeks: 0, dim: 0.22, eL: [0.96, 0.96], eR: [0.96, 0.96], eyeY: 4 },
    determined: { eyes: 'round', mouth: 'smirk', lid: [0.32, 14, 0], brow: [1, 2, 16], cheeks: 0.6 },
    suspicious: { eyes: 'round', mouth: 'pout', lid: [0.6, 8, 0.28], lidR: [0.26, -2, 0.08], eR: [1.04, 1.04], brow: [1, 6, 14], browR: [1, -10, -8], look: [0.55, 0], cheeks: 0.3 },
    warning: { eyes: 'round', mouth: 'flat', lid: [0.36, 22, 0.07], brow: [1, 4, 24], tint: 1, cheeks: 0.3 },
    proud: { eyes: 'happy', mouth: 'smirk', cheeks: 1, faceY: -5, eyeY: -2 },
    // supporting presets used by the body states
    friendly: { eyes: 'round', mouth: 'open', cheeks: 1 },
    listening: { eyes: 'round', mouth: 'smile', eL: [1.06, 1.06], eR: [1.06, 1.06], brow: [0.6, -12, -4], cheeks: 0.85 },
    confused: { eyes: 'round', mouth: 'wobble', eL: [1.04, 1.06], eR: [0.86, 0.8], brow: [1, -14, -12], browR: [1, 2, 8], look: [-0.15, -0.3], cheeks: 0.4 },
    encourage: { eyes: 'round', mouth: 'smile', lid: [0.12, 6, 0.05], brow: [0.7, -6, -2], cheeks: 0.95 },
    closed: { eyes: 'line', mouth: 'smile', cheeks: 0.8 },
  };
  const EXPRESSION_LABELS = {
    neutral: 'neutral', happy: 'happy', excited: 'excited', surprised: 'surprised', thinking: 'thinking',
    concerned: 'concerned', sad: 'sad', determined: 'determined', suspicious: 'suspicious', warning: 'warning',
    proud: 'proud', friendly: 'friendly', listening: 'listening', confused: 'confused', encourage: 'encouraging', closed: 'eyes closed',
  };

  /* ======================================================================
   * 6. BODY STATES — central choreography config
   *
   * A state is a list of steps on a timeline (ms):
   *   { at, face, look, fx, blink }            → fired at `at` (face leads)
   *   { at, pose, spring, hands, order, kick, shake, abs }
   *                                            → fired at `at + lead`, each bone
   *                                              further delayed by its `lag`
   * pose values are absolute targets; a value may be [target, tweenMs, ease]
   * to move the spring target along an eased path (jumps, slow sinks).
   * Unmentioned channels keep their previous target inside a state;
   * when a new state starts every body channel heads back to rest.
   * ==================================================================== */
  const arm = (s, u, f, h) => ({ ['upper_arm_' + s]: { r: u }, ['forearm_' + s]: { r: f }, ['hand_' + s]: { r: h } });
  const restArm = (s) => arm(s, REST_ARM[0], REST_ARM[1], REST_ARM[2]);
  function P(...parts) {
    const out = {};
    for (const p of parts) for (const k in p) out[k] = Object.assign(out[k] || {}, p[k]);
    return out;
  }
  const HANDS_RELAXED = { L: 'relaxed', R: 'relaxed' };
  const ORDER_BACK = { L: 'back', R: 'back' };

  // Point / present factory (dir −1 = left, +1 = right)
  function pointState(dir) {
    const S = dir < 0 ? 'L' : 'R';
    const O = dir < 0 ? 'R' : 'L';
    return {
      label: dir < 0 ? 'Point Left' : 'Point Right',
      dur: 1850, spring: 'bouncy', target: dir < 0 ? 'left' : 'right',
      steps: [
        { at: 0, face: 'friendly', look: [0.95 * dir, -0.4] },                       // eyes first
        { at: 40, spring: 'default', pose: { head: { r: 4 * dir }, neck: { r: 2 * dir } } }, // head follows
        { at: 150, spring: 'snappy', hands: { [S]: 'fist' },                          // wind back
          pose: P({ spine: { r: -2.5 * dir }, mascot_root: { sx: 0.97, sy: 1.03 } }, arm(S, 24, -62, -10)) },
        { at: 330, hands: { [S]: 'point', [O]: 'fist' },                              // extend + overshoot
          pose: P({ spine: { r: 5 * dir }, chest: { r: 2 * dir }, hip: { x: 5 * dir }, mascot_root: { sx: 1, sy: 1 }, head: { r: 7 * dir } },
            arm(S, 112, 4, 0), arm(O, 40, -95, -10)) },
        { at: 980, spring: 'snappy', pose: arm(S, 113, -8, -8) },                     // "tap tap"
        { at: 1090, spring: 'bouncy', pose: arm(S, 112, 4, 0) },
        { at: 1420, look: null, spring: 'default',
          pose: P({ spine: { r: 0 }, chest: { r: 0 }, hip: { x: 0 }, head: { r: 0 }, neck: { r: 0 } }, restArm(S), restArm(O)) },
        { at: 1600, hands: HANDS_RELAXED },
      ],
    };
  }

  const STATES = {
    idle: {
      label: 'Idle', loop: true, spring: 'gentle', wander: true, fidgets: true,
      steps: [
        { at: 0, face: 'neutral', look: null },
        { at: 0, pose: {}, hands: HANDS_RELAXED, order: ORDER_BACK },
      ],
      proc(t, A) {
        const b = Math.sin((t / 2100) * TAU);
        const b2 = Math.sin((t / 2100) * TAU - 0.7);
        A('spine.sy', 0.014 * b); A('spine.sx', -0.007 * b);
        A('chest.y', -1.1 * b);
        A('head.y', -1.6 * b2);
        A('shoulder_L.y', -1.2 * b2); A('shoulder_R.y', -1.2 * b2);
        A('upper_arm_L.r', 1.6 * b2); A('upper_arm_R.r', 1.3 * Math.sin((t / 2100) * TAU - 1.2));
        A('head.r', 0.9 * Math.sin((t / 4700) * TAU));
        A('antenna_1.r', 2.2 * Math.sin((t / 3100) * TAU));
      },
    },

    wave: {
      label: 'Wave', dur: 1750, spring: 'bouncy',
      steps: [
        { at: 0, face: 'happy', look: [0.1, -0.08] },
        { at: 0, spring: 'snappy', pose: P({ mascot_root: { sx: 1.04, sy: 0.95 }, hip: { y: 4 }, spine: { r: -2 }, shoulder_L: { y: 3 }, head: { r: 2 } }, arm('L', 4, -16, -8)) },
        { at: 160, hands: { L: 'open' }, order: { L: 'front' },
          pose: P({ mascot_root: { sx: 0.97, sy: 1.04 }, hip: { y: 0 }, spine: { r: 5 }, chest: { r: 1 }, shoulder_L: { y: -6, r: -4 }, head: { r: -7 }, neck: { r: -2 }, ikR: { y: -3 } },
            arm('L', 98, 46, 6)) },
        { at: 340, spring: 'snappy', pose: P({ mascot_root: { sx: 1, sy: 1 } }, arm('L', 96, 30, -18)) },
        { at: 500, spring: 'snappy', pose: arm('L', 98, 66, 14) },
        { at: 660, spring: 'snappy', pose: arm('L', 96, 32, -16) },
        { at: 820, spring: 'snappy', pose: arm('L', 98, 64, 12) },
        { at: 980, pose: arm('L', 97, 48, 0) },
        { at: 1220, spring: 'default',
          pose: P({ spine: { r: 0 }, chest: { r: 0 }, shoulder_L: { y: 0, r: 0 }, head: { r: 0 }, neck: { r: 0 }, ikR: { y: 0 } }, restArm('L')) },
        { at: 1400, hands: HANDS_RELAXED, order: ORDER_BACK, look: null },
      ],
    },

    celebrate: {
      label: 'Celebrate', dur: 2200, spring: 'bouncy',
      steps: [
        { at: 0, face: 'excited' },
        { at: 0, spring: 'snappy', hands: { L: 'fist', R: 'fist' },                    // strong crouch
          pose: P({ mascot_root: { sy: 0.86, sx: 1.1 }, hip: { y: 16 }, spine: { sy: 0.95 }, head: { y: 3 }, ikL: { x: 4 }, ikR: { x: 4 } },
            arm('L', 30, -40, 0), arm('R', 30, -40, 0)) },
        { at: 290, spring: 'track', pose: { mascot_root: { y: [-120, 270, 'outQuad'] } } }, // launch
        { at: 290, order: { L: 'front', R: 'front' },
          pose: P({ mascot_root: { sy: 1.16, sx: 0.9 }, hip: { y: -2 }, spine: { sy: 1.04 }, head: { y: -2 },
            ikL: { x: 8, y: -20, r: 14 }, ikR: { x: 6, y: -16, r: 10 } },
          arm('L', 142, 18, 6), arm('R', 136, 24, 6)) },
        { at: 300, fx: [{ name: 'confetti' }, { name: 'sparkles', n: 7, y: 330, r: 230 }] },
        { at: 480, pose: P({ mascot_root: { sy: 1, sx: 1 } }, arm('L', 126, 36, 8), arm('R', 150, 14, 4)) }, // apex fist pump
        { at: 570, spring: 'track', pose: { mascot_root: { y: [0, 230, 'inQuad'] } } },
        { at: 610, spring: 'default', pose: { mascot_root: { sy: 1.06, sx: 0.96 }, ikL: { x: 2, y: -4, r: 0 }, ikR: { x: 2, y: -4, r: 0 } } },
        { at: 800, fx: 'dust' },
        { at: 800, kick: { 'head.y': 150, 'hat.sy': -1.3 },                               // landing squash
          pose: P({ mascot_root: { sy: 0.82, sx: 1.14 }, hip: { y: 13 }, ikL: { x: 4, y: 0 }, ikR: { x: 4, y: 0 } }, arm('L', 124, 30, 6), arm('R', 124, 30, 6)) },
        { at: 890, spring: 'track', pose: { mascot_root: { y: [-34, 150, 'outQuad'] } } }, // rebound 1
        { at: 890, pose: P({ mascot_root: { sy: 1.07, sx: 0.95 }, hip: { y: -1 } }, arm('L', 146, 16, 6), arm('R', 146, 16, 6)) },
        { at: 1040, spring: 'track', pose: { mascot_root: { y: [0, 130, 'inQuad'] } } },
        { at: 1170, pose: { mascot_root: { sy: 0.91, sx: 1.06 }, hip: { y: 6 } } },
        { at: 1240, spring: 'track', pose: { mascot_root: { y: [-11, 110, 'outQuad'] } } }, // rebound 2
        { at: 1240, pose: { mascot_root: { sy: 1.02, sx: 0.99 }, hip: { y: 0 } } },
        { at: 1350, spring: 'track', pose: { mascot_root: { y: [0, 100, 'inQuad'] } } },
        { at: 1450, pose: { mascot_root: { sy: 0.97, sx: 1.02 }, hip: { y: 2 } } },
        { at: 1560, spring: 'default', pose: P({ mascot_root: { sy: 1, sx: 1 }, hip: { y: 0 }, spine: { sy: 1 }, head: { y: 0 }, ikL: { x: 0, y: 0 }, ikR: { x: 0, y: 0 } }, restArm('L'), restArm('R')) },
        { at: 1820, hands: HANDS_RELAXED, order: ORDER_BACK },
      ],
    },

    point_left: pointState(-1),
    point_right: pointState(1),

    think: {
      label: 'Think', loop: { from: 1000, to: 3400 }, spring: 'default', lead: 80,
      steps: [
        { at: 0, face: 'thinking' },
        { at: 0, order: { R: 'front' }, hands: { R: 'fist', L: 'relaxed' },
          pose: P({ head: { r: 8 }, neck: { r: 3 }, spine: { r: -2 }, hip: { x: -3 }, 'glow': { antenna: 0.55 } },
            arm('R', -55, -123, 0), arm('L', -24, -66, 0)) },
        { at: 1200, look: [0.3, -0.78], pose: { head: { r: 5 }, hip: { x: -2 } } },
        { at: 2300, look: [0.62, -0.62], pose: { head: { r: 10 }, hip: { x: -4 } } },
      ],
      proc(t, A) {
        A('glow.antenna', 0.4 * Math.sin((t / 760) * TAU));
        A('antenna_tip.sx', 0.05 * Math.max(0, Math.sin((t / 760) * TAU)));
        A('antenna_tip.sy', 0.05 * Math.max(0, Math.sin((t / 760) * TAU)));
        A('spine.sy', 0.01 * Math.sin((t / 2400) * TAU));
      },
    },

    alert: {
      label: 'Alert', loop: { from: 900, to: 3300 }, spring: 'snappy', lead: 30, stagger: 0.55,
      steps: [
        { at: 0, face: 'warning', look: [0, 0.05] },
        { at: 0, pose: P({ spine: { r: -3 }, mascot_root: { sy: 1.04, sx: 0.98 }, hip: { y: -2 }, head: { r: -3 } }, arm('L', 30, -20, -6), arm('R', 30, -20, -6)) }, // anticipation
        { at: 90, fx: [{ name: 'exclaim', bound: true }, { name: 'ring', loop: true }] },
        { at: 110, hands: { L: 'open', R: 'fist' }, shake: { amp: 5, ms: 280 },          // SNAP — stop hand
          pose: P({ mascot_root: { sy: 0.92, sx: 1.07 }, hip: { y: 7 }, spine: { r: 3 }, chest: { r: 1 }, head: { r: 4 },
            ikL: { x: 10 }, ikR: { x: 10 }, glow: { antenna: 1 } }, arm('L', 96, 64, 2), arm('R', 40, -95, -10)) },
        { at: 330, spring: 'firm', pose: { mascot_root: { sy: 1, sx: 1 }, hip: { y: 4 }, spine: { r: 2 } } },
        { at: 1500, spring: 'snappy', pose: arm('L', 97, 54, -6) },                    // firm "stop!" push
        { at: 1640, spring: 'firm', pose: arm('L', 96, 64, 2) },
        { at: 2400, spring: 'firm', pose: { head: { r: 2 } } },
        { at: 2900, spring: 'firm', pose: { head: { r: 4 } } },
      ],
      proc(t, A) {
        A('spine.sy', 0.008 * Math.sin((t / 1600) * TAU));
        A('glow.antenna', 0.25 * Math.sin((t / 500) * TAU));
      },
    },

    confused: {
      label: 'Confused', loop: { from: 900, to: 3600 }, spring: 'default',
      steps: [
        { at: 0, face: 'confused', fx: { name: 'question', bound: true } },
        { at: 0, hands: { L: 'open', R: 'open' },
          pose: P({ head: { r: -11 }, neck: { r: -3 }, spine: { r: 2 }, shoulder_L: { y: -8 }, shoulder_R: { y: -8 }, mascot_root: { sy: 1.02, sx: 0.99 } },
            arm('L', 28, 58, 22), arm('R', 28, 58, 22)) },
        { at: 380, spring: 'bouncy', pose: { shoulder_L: { y: -3 }, shoulder_R: { y: -3 }, mascot_root: { sy: 1, sx: 1 } } },
        { at: 1000, look: [0.22, -0.35], spring: 'snappy', pose: { head: { r: 9 }, neck: { r: 2 }, spine: { r: -1 } } },       // quick tilt
        { at: 1900, look: [-0.25, -0.3], spring: 'gentle',                                                                       // slow tilt back + re-shrug
          pose: { head: { r: -10 }, neck: { r: -3 }, spine: { r: 2 }, shoulder_L: { y: -8 }, shoulder_R: { y: -5 } } },
        { at: 2350, spring: 'bouncy', pose: { shoulder_L: { y: -3 }, shoulder_R: { y: -2 } } },
        { at: 3050, spring: 'default', pose: { head: { r: -12 } } },
      ],
    },

    sad: {
      label: 'Sad', loop: { from: 1500, to: 4500 }, spring: 'soft', lead: 120, stagger: 1.6,
      steps: [
        { at: 0, face: 'sad' },
        { at: 0, pose: P({ hip: { y: [3, 700, 'inOutSine'] }, spine: { sy: [0.95, 700, 'inOutSine'] }, chest: { y: 3, r: 0 },
          shoulder_L: { y: 6 }, shoulder_R: { y: 6 }, head: { y: 10, r: -4 }, neck: { y: 3 },
          antenna_1: { r: 26 }, antenna_2: { r: 16 }, hat: { y: 5, r: -2 } }, arm('L', 6, -2, 0), arm('R', 6, -2, 0)) },
        { at: 2400, pose: { spine: { sy: [0.93, 900, 'inOutSine'] }, head: { y: [13, 900, 'inOutSine'] } } }, // slow sigh
        { at: 3500, pose: { spine: { sy: [0.95, 900, 'inOutSine'] }, head: { y: [10, 900, 'inOutSine'] } } },
      ],
    },

    success: {
      label: 'Success', dur: 2050, spring: 'bouncy',
      steps: [
        { at: 0, face: 'proud' },
        { at: 0, spring: 'snappy', pose: { mascot_root: { sy: 0.94, sx: 1.04 }, hip: { y: 5 } } },
        { at: 170, hands: { R: 'thumbs', L: 'fist' },
          pose: P({ mascot_root: { sy: 1.03, sx: 0.98 }, hip: { y: 0 }, spine: { sy: 1.05, sx: 0.98 }, chest: { y: -3 }, head: { y: -6, r: -3 }, glow: { badge: 1 } },
            arm('R', 34, 108, 22), arm('L', 40, -95, -10)) },
        { at: 250, fx: 'badgeShine' },
        { at: 330, fx: { name: 'sparkles', n: 5, x: 300, y: 450, r: 120 } },
        { at: 430, spring: 'default', pose: { mascot_root: { sy: 1, sx: 1 } } },
        { at: 1500, spring: 'default', pose: P({ spine: { sy: 1, sx: 1 }, chest: { y: 0 }, head: { y: 0, r: 0 }, glow: { badge: 0 } }, restArm('L'), restArm('R')) },
        { at: 1680, hands: HANDS_RELAXED },
      ],
    },

    listen: {
      label: 'Listen', loop: { from: 1000, to: 3400 }, spring: 'gentle', wander: false,
      steps: [
        { at: 0, face: 'listening', look: [0.25, 0.15] },
        { at: 0, order: { R: 'front' }, hands: { R: 'open' },
          pose: P({ spine: { r: 4 }, hip: { x: 3 }, head: { r: 8 }, neck: { r: 2 }, glow: { earR: 0.6 } }, arm('R', 120, 30, 10)) },
        { at: 1100, spring: 'default', pose: { head: { r: 11, y: 4 } } }, // nod
        { at: 1350, spring: 'default', pose: { head: { r: 8, y: 0 } } },
        { at: 2500, spring: 'default', pose: { head: { r: 11, y: 3 } } },
        { at: 2720, spring: 'default', pose: { head: { r: 8, y: 0 } } },
      ],
      proc(t, A) {
        A('glow.earR', 0.35 * Math.sin((t / 600) * TAU));
        A('ear_R.sx', 0.03 * Math.sin((t / 600) * TAU));
        A('ear_R.sy', 0.03 * Math.sin((t / 600) * TAU));
        A('spine.sy', 0.01 * Math.sin((t / 2200) * TAU));
      },
    },

    /* ---------------- ThinkSecure specific ---------------- */
    scam: {
      label: 'Scam Spotted', dur: 3400, spring: 'default', target: 'right', warnTarget: true,
      steps: [
        { at: 0, look: [0.92, -0.42], face: 'surprised', fx: { name: 'burst' } },        // eyes snap to it
        { at: 0, spring: 'snappy', hands: { L: 'open', R: 'open' },
          pose: P({ mascot_root: { sy: 1.06, sx: 0.96 }, head: { r: 5 }, neck: { r: 2 }, spine: { r: 2 } }, arm('L', 34, 40, 10), arm('R', 34, 40, 10)) },
        { at: 170, spring: 'bouncy', pose: { mascot_root: { sy: 1, sx: 1 } } },
        { at: 540, face: 'suspicious', look: [0.85, -0.3] },                                // brief thinking
        { at: 540, order: { R: 'front' }, hands: { R: 'fist', L: 'relaxed' },
          pose: P({ spine: { r: 5 }, hip: { x: 5 }, head: { r: 8 }, neck: { r: 3 }, glow: { antenna: 0.8 } }, arm('R', -55, -123, 0), arm('L', -24, -66, 0)) },
        { at: 1300, face: 'determined', look: [0.3, -0.05] },
        { at: 1380, spring: 'snappy', hands: { L: 'fist', R: 'fist' },                     // anticipation
          pose: P({ spine: { r: -3 }, hip: { x: 0 }, head: { r: -3 }, neck: { r: 0 }, mascot_root: { sy: 1.05, sx: 0.97 }, glow: { antenna: 0 } }, arm('L', 30, -30, 0), arm('R', 30, -30, 0)) },
        { at: 1480, order: { R: 'back' } },
        { at: 1500, face: 'warning', fx: [{ name: 'exclaim', hold: 1500 }, 'steam', { name: 'ring' }] },
        { at: 1540, spring: 'snappy', shake: { amp: 4, ms: 260 },                           // warning pose: crossed arms
          pose: P({ mascot_root: { sy: 0.92, sx: 1.07 }, hip: { y: 6 }, spine: { r: 2 }, head: { r: 4 }, ikL: { x: 8 }, ikR: { x: 8 } },
            arm('L', -18, -72, 10), arm('R', -18, -72, 10)) },
        { at: 1760, spring: 'firm', pose: { mascot_root: { sy: 1, sx: 1 }, hip: { y: 3 } } },
        { at: 2900, look: null, spring: 'default', pose: P({ head: { r: 0 }, spine: { r: 0 }, hip: { y: 0 }, ikL: { x: 0 }, ikR: { x: 0 } }, restArm('L'), restArm('R')) },
        { at: 3100, hands: HANDS_RELAXED },
      ],
    },

    correct: {
      label: 'Correct', dur: 760, spring: 'bouncy', lead: 30, stagger: 0.6,
      steps: [
        { at: 0, face: 'happy', fx: 'check' },
        { at: 0, spring: 'snappy', pose: { mascot_root: { sy: 0.92, sx: 1.05 }, hip: { y: 7 } } },
        { at: 110, spring: 'track', pose: { mascot_root: { y: [-34, 140, 'outQuad'] } } },
        { at: 110, hands: { L: 'fist', R: 'fist' },
          pose: P({ mascot_root: { sy: 1.07, sx: 0.95 }, hip: { y: -1 }, ikL: { y: -6 }, ikR: { y: -6 } }, arm('L', 40, 50, 0), arm('R', 40, 50, 0)) },
        { at: 160, fx: { name: 'sparkles', n: 4, y: 300, r: 190 } },
        { at: 250, spring: 'track', pose: { mascot_root: { y: [0, 110, 'inQuad'] } } },
        { at: 360, pose: { mascot_root: { sy: 0.95, sx: 1.04 }, hip: { y: 4 }, ikL: { y: 0 }, ikR: { y: 0 } } },
        { at: 440, spring: 'default', pose: P({ mascot_root: { sy: 1, sx: 1 }, hip: { y: 0 } }, restArm('L'), restArm('R')) },
        { at: 600, hands: HANDS_RELAXED },
      ],
    },

    wrong: {
      label: 'Wrong', dur: 2300, spring: 'default', lead: 50,
      steps: [
        { at: 0, face: 'concerned' },
        { at: 0, pose: { spine: { r: -2 }, head: { y: 3 }, mascot_root: { sy: 0.97, sx: 1.02 }, shoulder_L: { y: 3 }, shoulder_R: { y: 3 } } },
        { at: 240, spring: 'snappy', pose: { head: { r: -7 }, neck: { r: -2 } } },          // small head shake
        { at: 260, fx: 'sweat' },
        { at: 380, spring: 'snappy', pose: { head: { r: 7 }, neck: { r: 2 } } },
        { at: 520, spring: 'snappy', pose: { head: { r: -5 }, neck: { r: -1 } } },
        { at: 660, spring: 'snappy', pose: { head: { r: 3 }, neck: { r: 1 } } },
        { at: 800, pose: { head: { r: 0 }, neck: { r: 0 }, mascot_root: { sy: 1, sx: 1 } } },
        { at: 1150, face: 'encourage', look: [0, -0.1] },                                  // …then encourage
        { at: 1150, spring: 'bouncy', hands: { L: 'fist' }, order: { L: 'front' },             // side "you got this" pump
          pose: P({ spine: { r: 1, sy: 1.03 }, head: { y: -3, r: -2 }, shoulder_L: { y: 0 }, shoulder_R: { y: 0 } }, arm('L', 40, 100, 15)) },
        { at: 1500, spring: 'default', pose: { head: { y: 2 } } },                         // nod
        { at: 1660, spring: 'default', pose: { head: { y: -2 } } },
        { at: 1900, spring: 'default', pose: P({ spine: { r: 0, sy: 1 }, head: { y: 0, r: 0 } }, restArm('L')) },
        { at: 2050, hands: HANDS_RELAXED, order: ORDER_BACK, look: null },
      ],
    },

    nudge: {
      label: 'Nudge', dur: 950, spring: 'bouncy', target: 'cta',
      steps: [
        { at: 0, look: [0.8, 0.75], face: 'friendly' },
        { at: 40, spring: 'snappy', pose: { mascot_root: { sy: 0.94, sx: 1.04 }, hip: { y: 5 } } },
        { at: 150, spring: 'track', pose: { mascot_root: { y: [-18, 120, 'outQuad'] } } },
        { at: 150, hands: { R: 'point' }, pose: P({ mascot_root: { sy: 1.05, sx: 0.97 }, hip: { y: 0 }, head: { r: 6 }, spine: { r: 3 } }, arm('R', 52, 8, 0)) },
        { at: 270, spring: 'track', pose: { mascot_root: { y: [0, 100, 'inQuad'] } } },
        { at: 370, pose: { mascot_root: { sy: 0.96, sx: 1.03 } } },
        { at: 450, spring: 'default', pose: { mascot_root: { sy: 1, sx: 1 } } },
        { at: 700, spring: 'default', pose: P({ head: { r: 0 }, spine: { r: 0 } }, restArm('R')) },
        { at: 820, hands: HANDS_RELAXED, look: null },
      ],
    },

    /* ---------------- entrance / exit ---------------- */
    pop_in: {
      label: 'Pop In', dur: 1050, spring: 'bouncy', lead: 0,
      onStart(m) {
        m.hidden = false;
        m.snap('mascot_root.sx', 0); m.snap('mascot_root.sy', 0); m.snap('mascot_root.y', 0);
        m.snap('mascot_root.op', 1);
      },
      steps: [
        { at: 0, face: 'closed' },
        { at: 0, spring: 'track', pose: { mascot_root: { y: [-46, 200, 'outQuad'] } } },
        { at: 0, spring: 'pop', abs: true, pose: { mascot_root: { sx: 0.86, sy: 1.22 } } },
        { at: 200, spring: 'track', pose: { mascot_root: { y: [0, 150, 'inQuad'] } } },
        { at: 200, abs: true, pose: { mascot_root: { sx: 1, sy: 1 } } },
        { at: 350, face: 'excited', fx: ['dust', { name: 'sparkles', n: 6, y: 330, r: 220 }] },
        { at: 350, kick: { 'hat.sy': -1.4 }, pose: { mascot_root: { sx: 1.12, sy: 0.86 }, hip: { y: 8 } } },
        { at: 450, pose: { mascot_root: { sx: 1, sy: 1 }, hip: { y: 0 } } },
        { at: 520, hands: { L: 'open' }, order: { L: 'front' }, pose: arm('L', 96, 46, 0) },
        { at: 690, spring: 'snappy', pose: arm('L', 98, 66, 12) },
        { at: 830, spring: 'default', pose: restArm('L') },
        { at: 960, hands: HANDS_RELAXED, order: ORDER_BACK },
      ],
      reducedSteps: [
        { at: 0, face: 'happy' },
        { at: 0, spring: 'soft', abs: true, pose: { mascot_root: { sx: 1, sy: 1, op: 1 } } },
      ],
      reducedStart(m) {
        m.hidden = false;
        m.snap('mascot_root.sx', 0.97); m.snap('mascot_root.sy', 0.97); m.snap('mascot_root.y', 0);
        m.snap('mascot_root.op', 0);
      },
    },

    pop_out: {
      label: 'Pop Out', dur: 540, spring: 'snappy', lead: 0, next: 'hidden',
      steps: [
        { at: 0, face: 'happy' },
        { at: 0, pose: { mascot_root: { sx: 1.1, sy: 0.86 }, hip: { y: 9 } } },          // fast anticipation
        { at: 140, fx: 'lines' },
        { at: 140, spring: 'track', pose: { mascot_root: { y: [-90, 160, 'outQuad'] } } },
        { at: 140, hands: { L: 'fist', R: 'fist' }, order: { L: 'front', R: 'front' },
          pose: P({ mascot_root: { sx: 0.8, sy: 1.28 }, hip: { y: -2 }, ikL: { y: -10 }, ikR: { y: -10 } }, arm('L', 150, 10, 0), arm('R', 150, 10, 0)) },
        { at: 290, spring: 'track', abs: true, pose: { mascot_root: { sx: [0, 200, 'inCubic'], sy: [0, 200, 'inCubic'], y: [-130, 200, 'outQuad'] } } },
        { at: 330, fx: 'poof' },
      ],
      reducedSteps: [
        { at: 0, face: 'happy' },
        { at: 0, spring: 'track', abs: true, pose: { mascot_root: { op: [0, 380, 'inOutSine'], sx: [0.97, 380, 'inOutSine'], sy: [0.97, 380, 'inOutSine'] } } },
      ],
    },

    hidden: {
      label: 'Hidden', loop: true, keepPose: true, hiddenState: true,
      steps: [],
      onStart(m) { m.hidden = true; m.snap('mascot_root.op', 0); },
    },
  };

  // Small idle fidgets (scheduled at random while idling)
  const FIDGETS = {
    glance: { needsFreeLook: true, steps: [{ at: 0, look: [-0.72, 0.08] }, { at: 760, look: [0.62, -0.14] }, { at: 1500, look: null }] },
    boop: {
      steps: [
        { at: 0, face: 'happy' },
        { at: 0, spring: 'snappy', kick: { 'antenna_1.r': -260 }, pose: { hip: { y: 3 } } },
        { at: 170, spring: 'bouncy', pose: { hip: { y: 0 } } },
        { at: 950, face: 'neutral' },
      ],
    },
    bounce: {
      steps: [
        { at: 0, spring: 'snappy', pose: { mascot_root: { sy: 0.95, sx: 1.03 }, hip: { y: 4 } } },
        { at: 140, spring: 'bouncy', pose: { mascot_root: { sy: 1.03, sx: 0.98 }, hip: { y: 0 } } },
        { at: 320, spring: 'gentle', pose: { mascot_root: { sy: 1, sx: 1 } } },
      ],
    },
    shuffle: {
      steps: [
        { at: 0, spring: 'default', pose: { hip: { x: -4, r: -1.5 }, ikR: { y: -7, r: 6 }, head: { r: 2 } } },
        { at: 520, spring: 'bouncy', pose: { ikR: { y: 0, r: 0 } } },
        { at: 900, spring: 'gentle', pose: { hip: { x: 0, r: 0 }, head: { r: 0 } } },
      ],
    },
  };

  /* ======================================================================
   * 7. MASCOT — the runtime
   * ==================================================================== */
  const ZERO_LOOK = [0, 0];
  const IK_OUT = /^(thigh|shin|foot)_[LR]$/;

  class Mascot {
    constructor(svg) {
      this.svg = svg;
      this.doc = svg.ownerDocument;
      this.listeners = {};
      this.ch = {};
      this.groups = { body: [], face: [], look: [], ikOut: [] };
      this.bones = [];
      this.boneMap = {};
      this.missing = [];
      this.hidden = false;
      this.state = null;
      this.events = [];
      this.time = 0;
      this.stateLook = null; this.exprLook = null; this.apiLook = null; this.pointerLook = null; this.idleLook = null;
      this.lookSource = 'centre';
      this.expr = 'neutral'; this.exprDef = Object.assign({}, EXPR_DEFAULT);
      this.eyeStyle = null; this.mouthStyle = null;
      this.hands = { L: 'relaxed', R: 'relaxed' };
      this.order = { L: 'back', R: 'back' };
      this.pendingBack = { L: false, R: false };
      this.blink = { v: 0, t: 0, phase: null, next: rand(1500, 3500), cb: null, double: false, fast: false };
      this.shake = null; this.shakeX = 0;
      this.fidgetTimer = rand(6000, 10000);
      this.wanderTimer = rand(2500, 5000);
      this.rigOn = false; this.rigLabels = true;
      this.lastRequested = 'idle';
      this.dyn = {
        hx: new Follower(170, 0.38), hy: new Follower(170, 0.38), ha: new Follower(170, 0.4),
        hx2: new Follower(95, 0.3), hy2: new Follower(95, 0.3), ha2: new Follower(95, 0.32),
        cx: new Follower(260, 0.36), cy: new Follower(260, 0.36), ca: new Follower(260, 0.38),
      };
      this._A = (name, v) => { const c = this.ch[name]; if (c) c.add += v; };
      this._build();
      this.fx = new FXManager(this);
      this._buildRig();
      this.setExpression('neutral', { instant: true });
      this.play('idle');
      this._loopBound = this._loop.bind(this);
      this._last = performance.now();
      requestAnimationFrame(this._loopBound);
    }

    /* ---------------- events ---------------- */
    on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); return this; }
    emit(evt, data) { const l = this.listeners[evt]; if (l) for (const fn of l) fn(data); }

    /* ---------------- build ---------------- */
    _byId(id) { return this.doc.getElementById(id); }

    _build() {
      for (const id in BONES) {
        const def = BONES[id];
        const el = this._byId(id);
        if (!el || !this.svg.contains(el)) { this.missing.push(id); continue; }
        const b = { id, el, parent: def.parent, px: def.pivot[0], py: def.pivot[1], kind: def.kind, lag: def.lag || 0, chans: {},
          ax: 0, ay: 0, ar: 0, asx: 1, asy: 1 };
        const group = IK_OUT.test(id) ? 'ikOut' : (def.group || 'body');
        for (const p of def.ch.split(' ').filter(Boolean)) {
          const name = id + '.' + p;
          const rest = name in REST ? REST[name] : (p === 'sx' || p === 'sy' || p === 'op') ? 1 : 0;
          const c = new Channel(name, rest);
          this.ch[name] = c; b.chans[p] = c;
          this.groups[group].push(c);
        }
        b.hasT = ['x', 'y', 'r', 'sx', 'sy'].some((p) => b.chans[p]);
        this.bones.push(b);
        this.boneMap[id] = b;
      }
      for (const [name, rest, group] of EXTRA_CHANNELS) {
        const c = new Channel(name, rest);
        this.ch[name] = c;
        this.groups[group].push(c);
      }
      this.stepped = [].concat(this.groups.body, this.groups.face, this.groups.look);
      this.allChannels = this.stepped.concat(this.groups.ikOut);

      const need = (id) => { const e = this._byId(id); if (!e) this.missing.push(id); return e; };
      this.el = {
        art: need('mascot_art'), chest: need('chest'), neck: need('neck'),
        slotL: need('arm_L_slot'), slotR: need('arm_R_slot'),
        lidL: need('lidPath_L'), lidR: need('lidPath_R'),
        tint: need('screen_tint'), dim: need('screen_dim'),
        cheekL: need('cheek_L'), cheekR: need('cheek_R'),
        badgeGlow: need('badge_glow'), shine: need('badge_shine'), glint: need('screen_glint'),
        antennaGlow: need('antenna_glow'), earGlowL: need('ear_glow_L'), earGlowR: need('ear_glow_R'),
        shadow: need('ground_shadow'),
      };
      const eyeL = this.boneMap.eye_L && this.boneMap.eye_L.el, eyeR = this.boneMap.eye_R && this.boneMap.eye_R.el;
      this.eyeStyles = { L: eyeL ? [...eyeL.querySelectorAll('.eye-style')] : [], R: eyeR ? [...eyeR.querySelectorAll('.eye-style')] : [] };
      this.pupils = [...this.svg.querySelectorAll('.pupil')];
      const mouth = this.boneMap.mouth && this.boneMap.mouth.el;
      this.mouthStyles = mouth ? [...mouth.querySelectorAll('.mouth-style')] : [];
      this.mouthDots = mouth ? [...mouth.querySelectorAll('.mdot')] : [];
      this.handVars = {
        L: this.boneMap.hand_L ? [...this.boneMap.hand_L.el.querySelectorAll('.hand-var')] : [],
        R: this.boneMap.hand_R ? [...this.boneMap.hand_R.el.querySelectorAll('.hand-var')] : [],
      };
      this._measureLegs();
      if (this.missing.length) console.warn('[mascot] missing SVG ids:', this.missing.join(', '));
    }

    // Reads each leg's real geometry from the artwork (before any rig transform is written):
    // thigh frame -> hip space, knee offset (A), ankle offset (B), rest ankle position.
    _measureLegs() {
      this.legGeo = {};
      const hip = this._byId('hip');
      // position of child's pivot (its origin) inside the parent bone's coordinates
      const at = (parent, child) => { const k = parent.getCTM().inverse().multiply(child.getCTM()); return [k.e, k.f]; };
      for (const side of ['L', 'R']) {
        const thigh = this._byId('thigh_' + side), shin = this._byId('shin_' + side), foot = this._byId('foot_' + side);
        if (!hip || !thigh || !shin || !foot) continue;
        const m = hip.getCTM().inverse().multiply(thigh.getCTM());
        const toHip = [m.a, m.b, m.c, m.d, m.e, m.f];
        const A = at(thigh, shin), B = at(shin, foot);
        const rest = Mx.apply(toHip, A[0] + B[0], A[1] + B[1]);
        const thA0 = Math.atan2(-A[0], A[1]) / DEG, thB0 = Math.atan2(-B[0], B[1]) / DEG;
        const dirRest = Math.atan2(-(A[0] + B[0]), A[1] + B[1]) / DEG;
        const a = Math.hypot(A[0], A[1]), b = Math.hypot(B[0], B[1]), D0 = Math.hypot(A[0] + B[0], A[1] + B[1]);
        const bendRest = Math.acos(clamp((a * a + D0 * D0 - b * b) / (2 * a * D0), -1, 1)) / DEG;
        this.legGeo[side] = {
          toHip, fromHip: Mx.inv(toHip), A, B, rest, thA0, thB0,
          a, b,
          // knees always bow outward when crouching; corr keeps the artwork's rest pose exact
          corr: thA0 - (dirRest + bendRest), D0,
          mirror: toHip[0] * toHip[3] - toHip[1] * toHip[2] < 0,
          out: rest[0] < 300 ? -1 : 1,
        };
      }
    }

    /* ---------------- public API ---------------- */
    play(name, opts = {}) {
      const def = STATES[name];
      if (!def) { console.warn('[mascot] unknown state', name); return this; }
      if (this.hidden && name === 'pop_out') return this;
      if (this.hidden && name !== 'pop_in' && !def.hiddenState) return this.play('pop_in', { then: name });
      if (!def.hiddenState && name !== 'pop_in' && name !== 'pop_out') this.lastRequested = name;
      if (name === 'pop_in' && opts.then) this.lastRequested = opts.then;

      this.fx.releaseState();
      this.events.length = 0;
      this.stateLook = null;
      this.state = { name, def, t: 0, then: opts.then || null };
      const reduced = SETTINGS.reduced;
      if (!def.keepPose) this._resetBody(SPRING[def.spring || 'default']);
      if (reduced && def.reducedStart) def.reducedStart(this);
      else if (def.onStart) def.onStart(this);
      const steps = (reduced && def.reducedSteps) || def.steps;
      this._defaultsFor(def, steps);
      this._schedule(steps, 0, def);
      this._runDue();
      this.emit('state', {
        name, label: def.label || name, loop: !!def.loop, dur: def.dur || 0,
        target: def.target || null, warn: !!def.warnTarget, hidden: !!def.hiddenState,
      });
      return this;
    }

    setExpression(name, opts = {}) {
      if (name === 'blink') { this.triggerBlink(); return this; }
      const preset = EXPRESSIONS[name];
      if (!preset) { console.warn('[mascot] unknown expression', name); return this; }
      const e = Object.assign({}, EXPR_DEFAULT, preset);
      this.expr = name; this.exprDef = e;
      const instant = !!opts.instant;
      const S = (n, v, prof = SPRING.face) => (instant ? this.snap(n, v) : this.ch[n].set(v, prof));
      if (e.eyes !== this.eyeStyle) {
        if (instant || this.eyeStyle === null) this._showEyes(e.eyes);
        else this._cut(() => this._showEyes(e.eyes));
      }
      if (e.mouth !== this.mouthStyle) {
        const first = this.mouthStyle === null;
        this._showMouth(e.mouth);
        if (!instant && !first && !SETTINGS.reduced) { this.ch['mouth.sx'].v = 0.45; this.ch['mouth.sy'].v = 0.45; }
      }
      S('eye_L.sx', e.eL[0]); S('eye_L.sy', e.eL[1]);
      S('eye_R.sx', e.eR[0]); S('eye_R.sy', e.eR[1]);
      S('eye_L.y', e.eyeY); S('eye_R.y', e.eyeY);
      const lr = e.lidR || e.lid;
      S('lid.topL', e.lid[0], SPRING.lid); S('lid.angL', e.lid[1], SPRING.lid); S('lid.botL', e.lid[2], SPRING.lid);
      S('lid.topR', lr[0], SPRING.lid); S('lid.angR', lr[1], SPRING.lid); S('lid.botR', lr[2], SPRING.lid);
      const br = e.browR || e.brow;
      S('brow_L.op', e.brow[0]); S('brow_L.y', e.brow[1]); S('brow_L.r', e.brow[2]);
      S('brow_R.op', br[0]); S('brow_R.y', br[1]); S('brow_R.r', -br[2]);
      S('face.cheeks', e.cheeks); S('face.tint', e.tint); S('face.dim', e.dim);
      S('mouth.y', e.mouthY); S('face.y', e.faceY);
      this.exprLook = e.look;
      this.emit('expression', { name, label: EXPRESSION_LABELS[name] || name });
      return this;
    }

    lookAt(x, y) { this.apiLook = [clamp(x, -1, 1), clamp(y, -1, 1)]; return this; }
    clearLook() { this.apiLook = null; return this; }
    lookAtClient(cx, cy) {
      const head = this.boneMap.head;
      if (!head) return this;
      const m = head.el.getScreenCTM();
      if (!m) return this;
      const p = new DOMPoint(300, 276).matrixTransform(m);
      const H = this.svg.getBoundingClientRect().height || 500;
      this.pointerLook = [Math.tanh((cx - p.x) / (H * 0.45)), Math.tanh((cy - p.y) / (H * 0.4))];
      return this;
    }
    clearPointerLook() { this.pointerLook = null; return this; }

    setSpeed(v) { SETTINGS.speed = clamp(+v || 1, 0.05, 4); return this; }
    setIntensity(v) { SETTINGS.intensity = clamp(+v, 0.1, 2); return this; }
    setReducedMotion(on) { SETTINGS.reduced = !!on; return this; }
    setPointerLook(on) { SETTINGS.pointerLook = !!on; if (!on) this.pointerLook = null; return this; }
    setFidgets(on) { SETTINGS.fidgets = !!on; return this; }
    get settings() { return Object.assign({}, SETTINGS); }
    get stateName() { return this.state ? this.state.name : null; }

    reset() {
      for (const c of this.allChannels) { c.snap(c.rest); c.add = 0; c.k = 300; c.z = 0.5; }
      for (const k in this.dyn) this.dyn[k].reset();
      this.fx.clear();
      this.hidden = false;
      this.shake = null; this.shakeX = 0;
      this.events.length = 0;
      this.setHand('L', 'relaxed', true); this.setHand('R', 'relaxed', true);
      this.setOrder('L', 'back', true); this.setOrder('R', 'back', true);
      this.blink = { v: 0, t: 0, phase: null, next: rand(1500, 3500), cb: null, double: false, fast: false };
      this.stateLook = null; this.apiLook = null; this.idleLook = null;
      this.setExpression('neutral', { instant: true });
      this.play('idle');
      return this;
    }

    snap(name, v) { const c = this.ch[name]; if (c) c.snap(v); }

    /* ---------------- timeline ---------------- */
    _resetBody(profile) {
      for (const c of this.groups.body) c.set(c.rest, profile);
    }

    // States that never mention a side's hands / draw order get them reset.
    _defaultsFor(def, steps) {
      const touchesH = { L: false, R: false }, touchesO = { L: false, R: false };
      for (const s of steps) {
        if (s.hands) for (const k in s.hands) touchesH[k] = true;
        if (s.order) for (const k in s.order) touchesO[k] = true;
      }
      if (def.hiddenState) return;
      for (const side of ['L', 'R']) {
        if (!touchesH[side]) this._push(90, () => this.setHand(side, 'relaxed'));
        if (!touchesO[side]) this._push(220, () => this.setOrder(side, 'back'));
      }
    }

    _push(t, fn) { this.events.push({ t, fn }); }

    _schedule(steps, offset, def) {
      const lead = def.lead != null ? def.lead : 60;
      const stag = def.stagger != null ? def.stagger : 1;
      for (const s of steps) {
        const t0 = offset + s.at;
        if (s.face || s.look !== undefined || s.fx || s.blink) this._push(t0, () => this._faceStep(s));
        const tp = t0 + lead;
        if (s.pose) {
          const prof = SPRING[s.spring || def.spring || 'default'];
          const byLag = new Map();
          for (const key in s.pose) {
            const lag = ((BONES[key] && BONES[key].lag) || 0) * stag;
            if (!byLag.has(lag)) byLag.set(lag, []);
            byLag.get(lag).push(key);
          }
          for (const [lag, keys] of byLag) {
            this._push(tp + lag, () => { for (const k of keys) this._applyBonePose(k, s.pose[k], prof, s.abs); });
          }
        }
        if (s.order) this._push(tp, () => { for (const side in s.order) this.setOrder(side, s.order[side]); });
        if (s.hands) this._push(tp + 60 * stag, () => { for (const side in s.hands) this.setHand(side, s.hands[side]); });
        if (s.kick) this._push(tp, () => this._kick(s.kick));
        if (s.shake) this._push(tp, () => this._startShake(s.shake));
      }
      this.events.sort((a, b) => a.t - b.t);
    }

    _runDue() {
      const st = this.state;
      // events may start a new state (which clears this.events); guard on identity
      while (this.events.length && this.events[0].t <= st.t && this.state === st) {
        const e = this.events.shift();
        e.fn();
      }
    }

    _applyBonePose(key, props, prof, abs) {
      for (const p in props) {
        const c = this.ch[key + '.' + p];
        if (!c) { console.warn('[mascot] no channel', key + '.' + p); continue; }
        let v = props[p], ms = 0, ease;
        if (Array.isArray(v)) { ease = v[2]; ms = v[1]; v = v[0]; }
        c.set(this._exaggerate(key, p, v, abs), prof, ms, ease);
      }
    }

    _exaggerate(key, p, v, abs) {
      if (abs || key === 'glow' || key === 'ikL' || key === 'ikR') return v;
      if (p === 'sx' || p === 'sy') return 1 + (v - 1) * squashFactor();
      if (key === 'mascot_root' && (p === 'y' || p === 'x')) return v * jumpFactor();
      if (key === 'hip' && (p === 'y' || p === 'x')) return v * crouchFactor();
      return v;
    }

    _kick(kick) {
      if (SETTINGS.reduced) return;
      for (const name in kick) { const c = this.ch[name]; if (c) c.vel += kick[name] * SETTINGS.intensity; }
    }

    _startShake(o) {
      if (SETTINGS.reduced) return;
      this.shake = { t: 0, ms: o.ms || 260, amp: (o.amp || 4) * SETTINGS.intensity, freq: o.freq || 22 };
    }

    _faceStep(s) {
      if (s.face) this.setExpression(s.face);
      if (s.look !== undefined) this.stateLook = s.look;
      if (s.fx) { const list = Array.isArray(s.fx) ? s.fx : [s.fx]; for (const f of list) this.fx.play(f); }
      if (s.blink) this.triggerBlink();
    }

    _updateTimeline(dtMs) {
      const st = this.state;
      const def = st.def;
      st.t += dtMs;
      if (def.loop && def.loop.to && st.t >= def.loop.to) {
        const period = def.loop.to - def.loop.from;
        st.t -= period;
        for (const e of this.events) e.t -= period;
        this._schedule(def.steps.filter((s) => s.at >= def.loop.from && s.at < def.loop.to), 0, def);
      }
      this._runDue();
      if (this.state !== st) return;
      if (!def.loop && st.t >= def.dur) {
        this.play(st.then || def.next || 'idle');
        return;
      }
      // idle fidgets
      if (def.fidgets && SETTINGS.fidgets && !SETTINGS.reduced) {
        this.fidgetTimer -= dtMs;
        if (this.fidgetTimer <= 0) {
          this.fidgetTimer = rand(6500, 12000);
          const names = Object.keys(FIDGETS).filter((n) => !(FIDGETS[n].needsFreeLook && this._lookBusy()));
          if (names.length) this._schedule(FIDGETS[pick(names)].steps, st.t, { lead: 40, spring: 'default' });
        }
      }
      // idle look wander
      if (def.wander && !this._lookBusy()) {
        this.wanderTimer -= dtMs;
        if (this.wanderTimer <= 0) {
          if (this.idleLook) { this.idleLook = null; this.wanderTimer = rand(2600, 6000); }
          else {
            this.idleLook = [rand(-0.6, 0.6), rand(-0.3, 0.25)];
            this.wanderTimer = rand(700, 1500);
            if (Math.random() < 0.4) this.triggerBlink();
          }
        }
      } else if (!def.wander) {
        this.idleLook = null;
      }
    }

    _lookBusy() { return !!(this.apiLook || (SETTINGS.pointerLook && this.pointerLook) || this.stateLook); }

    _lookTarget() {
      if (this.stateLook) { this.lookSource = 'state'; return this.stateLook; }
      if (this.exprLook) { this.lookSource = 'expression'; return this.exprLook; }
      if (this.apiLook) { this.lookSource = 'api'; return this.apiLook; }
      if (SETTINGS.pointerLook && this.pointerLook) { this.lookSource = 'pointer'; return this.pointerLook; }
      if (this.idleLook) { this.lookSource = 'wander'; return this.idleLook; }
      this.lookSource = 'centre';
      return ZERO_LOOK;
    }

    /* ---------------- hands / draw order ---------------- */
    setHand(side, name, instant) {
      if (this.hands[side] === name && !instant) return;
      const vars = this.handVars[side];
      if (!vars.some((u) => u.dataset.hand === name)) { console.warn('[mascot] unknown hand', name); return; }
      this.hands[side] = name;
      for (const u of vars) u.setAttribute('display', u.dataset.hand === name ? 'inline' : 'none');
      const b = this.boneMap['hand_' + side];
      if (b && !instant && !SETTINGS.reduced) { b.chans.sx.v = 0.8; b.chans.sy.v = 0.8; }
    }

    // Draw-order swap (arm in front of / behind the head). Moving an arm back is
    // deferred until its hand has dropped below the chin, so raised fists never
    // visibly "pop" behind the head mid-motion.
    setOrder(side, where, force) {
      if (this.order[side] === where) { this.pendingBack[side] = false; return; }
      if (where === 'back' && !force && !this._handClearOfHead(side)) { this.pendingBack[side] = true; return; }
      this.pendingBack[side] = false;
      this.order[side] = where;
      const { chest, neck, slotL, slotR } = this.el;
      if (!chest || !neck || !slotL || !slotR) return;
      if (side === 'L') {
        if (where === 'front') { if (this.order.R === 'front') chest.insertBefore(slotL, slotR); else chest.appendChild(slotL); }
        else chest.insertBefore(slotL, this.order.R === 'back' ? slotR : neck);
      } else {
        if (where === 'front') chest.appendChild(slotR);
        else chest.insertBefore(slotR, neck);
      }
    }

    _handClearOfHead(side) {
      // measured, so it stays right whatever the glove artwork looks like
      const hand = this.boneMap['hand_' + side], head = this.boneMap.head;
      if (!hand || !head) return true;
      return hand.el.getBoundingClientRect().top > head.el.querySelector('use').getBoundingClientRect().bottom - 6;
    }

    /* ---------------- face helpers ---------------- */
    _showEyes(style) {
      this.eyeStyle = style;
      for (const side of ['L', 'R']) for (const g of this.eyeStyles[side]) g.setAttribute('display', g.dataset.style === style ? 'inline' : 'none');
    }
    _showMouth(style) {
      this.mouthStyle = style;
      for (const g of this.mouthStyles) g.setAttribute('display', g.dataset.mouth === style ? 'inline' : 'none');
    }

    /* ---------------- blink system ---------------- */
    triggerBlink(double) {
      const b = this.blink;
      if (b.phase || !this._canBlink()) return this;
      b.phase = 'close'; b.t = 0; b.cb = null; b.double = !!double; b.fast = false;
      return this;
    }
    _cut(cb) {
      const b = this.blink;
      if (b.phase === 'close' || b.phase === 'hold') {
        const prev = b.cb;
        b.cb = () => { if (prev) prev(); cb(); };
      } else {
        b.phase = 'close'; b.t = 0; b.cb = cb; b.double = false; b.fast = true;
      }
    }
    _canBlink() { return this.eyeStyle !== 'happy' && this.eyeStyle !== 'line' && !this.hidden; }
    _updateBlink(dtMs) {
      const b = this.blink;
      if (!b.phase) {
        b.next -= dtMs;
        if (b.next <= 0) {
          b.next = rand(2200, 5200);
          if (this._canBlink()) this.triggerBlink(Math.random() < 0.18);
        }
        b.v = 0;
        return;
      }
      b.t += dtMs * (b.fast ? 1.4 : 1);
      if (b.phase === 'close') {
        b.v = EASE.inQuad(clamp(b.t / 60, 0, 1));
        if (b.t >= 60) {
          b.phase = 'hold'; b.t = 0;
          if (b.cb) { const cb = b.cb; b.cb = null; cb(); }
        }
      } else if (b.phase === 'hold') {
        b.v = 1;
        if (b.t >= 40) { b.phase = 'open'; b.t = 0; }
      } else {
        b.v = 1 - EASE.outQuad(clamp(b.t / 110, 0, 1));
        if (b.t >= 110) {
          b.phase = null; b.v = 0; b.fast = false;
          if (b.double) { b.double = false; b.next = 150; }
        }
      }
    }

    /* ---------------- frame loop ---------------- */
    _loop(now) {
      const raw = Math.min(now - this._last, 50);
      this._last = now;
      try {
        this._tick(raw * SETTINGS.speed);
      } catch (err) {
        console.error('[mascot] frame error', err);
      }
      requestAnimationFrame(this._loopBound);
    }

    _tick(dtMs) {
      this.time += dtMs;
      this._updateTimeline(dtMs);

      // procedural layers (additive targets)
      for (const c of this.stepped) c.add = 0;
      const def = this.state.def;
      if (def.proc) def.proc(this.state.t, this._A);

      // look target → look springs (eyes fast, head slow = eyes lead the head)
      const L = this._lookTarget();
      this.ch['look.eyeX'].set(L[0], SPRING.lookEye); this.ch['look.eyeY'].set(L[1], SPRING.lookEye);
      this.ch['look.headX'].set(L[0], SPRING.lookHead); this.ch['look.headY'].set(L[1], SPRING.lookHead);

      this._updateBlink(dtMs);

      // tweens + springs, fixed sub-steps for stability
      for (const c of this.stepped) c.tweenStep(dtMs);
      let rem = dtMs / 1000;
      while (rem > 1e-6) {
        const h = Math.min(1 / 240, rem);
        for (const c of this.stepped) c.step(h);
        rem -= h;
      }

      // shake (post-spring, decaying)
      this.shakeX = 0;
      if (this.shake) {
        const s = this.shake;
        s.t += dtMs;
        const p = s.t / s.ms;
        if (p >= 1) this.shake = null;
        else this.shakeX = s.amp * Math.pow(1 - p, 2) * Math.sin((s.t / 1000) * s.freq * TAU);
      }

      for (const b of this.bones) { b.ax = 0; b.ay = 0; b.ar = 0; b.asx = 1; b.asy = 1; }
      for (const sd of ['L', 'R']) if (this.pendingBack[sd] && this._handClearOfHead(sd)) this.setOrder(sd, 'back');
      this._applyLook();
      this._applyFaceExtras();
      this._solveIK();
      this._dynamics(dtMs / 1000);
      this.fx.update(dtMs);
      this._render();
      if (this.rigOn) this._updateRig();
      this.emit('tick', this);
    }

    _applyLook() {
      const C = this.ch, B = this.boneMap;
      const ex = C['look.eyeX'].v, ey = C['look.eyeY'].v;
      const hx = C['look.headX'].v, hy = C['look.headY'].v;
      B.eye_L.ax += ex * 13; B.eye_L.ay += ey * 9;
      B.eye_R.ax += ex * 13; B.eye_R.ay += ey * 9;
      const pt = `translate(${f3(ex * 7)} ${f3(ey * 7)})`;
      for (const p of this.pupils) p.setAttribute('transform', pt);
      // fake ¾ turn: face slides, head turns a little, ears parallax
      B.face.ax += hx * 9; B.face.ay += hy * 5;
      B.head.ar += hx * 3.5; B.head.ax += hx * 4; B.head.ay += hy * 2;
      B.ear_L.ax -= hx * 5; B.ear_R.ax -= hx * 5;
      B.ear_L.asx *= 1 - Math.max(0, -hx) * 0.18;
      B.ear_R.asx *= 1 - Math.max(0, hx) * 0.18;
      B.hat.ax += hx * 3;
      B.antenna_1.ar -= hx * 4;
    }

    _applyFaceExtras() {
      const B = this.boneMap;
      const bv = this.blink.v;
      const sq = 1 - 0.9 * bv, st = 1 + 0.05 * bv;
      B.eye_L.asy *= sq; B.eye_R.asy *= sq;
      B.eye_L.asx *= st; B.eye_R.asx *= st;
      if (this.exprDef.pulse && !SETTINGS.reduced) {
        const p = 1 + 0.05 * Math.sin((this.time / 1000) * TAU * 2.2);
        B.eye_L.asx *= p; B.eye_L.asy *= p; B.eye_R.asx *= p; B.eye_R.asy *= p;
      }
    }

    /* ---------------- two-bone leg IK ---------------- */
    _solveIK() {
      const C = this.ch;
      const hip = Mx.local(300, 548, C['hip.x'].v, C['hip.y'].v, C['hip.r'].v, 1, 1);
      const inv = Mx.inv(hip);
      const hipRot = C['hip.r'].v + C['mascot_root.r'].v;
      for (const side of ['L', 'R']) {
        const g = this.legGeo[side];
        if (!g) continue;
        const tx = g.rest[0] + g.out * C['ik' + side + '.x'].v; // +ik.x = outward
        const ty = g.rest[1] + C['ik' + side + '.y'].v;
        const [hx, hy] = Mx.apply(inv, tx, ty);
        const [dx, dy] = Mx.apply(g.fromHip, hx, hy); // into the thigh's parent frame
        const a = g.a, b = g.b;
        const D = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b); // straight leg at full reach
        const dir = Math.atan2(-dx, dy) / DEG;
        const bend = Math.acos(clamp((a * a + D * D - b * b) / (2 * a * D), -1, 1)) / DEG;
        // rest correction fades out over the first 12u of compression, so crouches are exact
        const corr = g.corr * clamp((D - (g.D0 - 12)) / 12, 0, 1);
        const thigh = dir + bend - g.thA0 + corr;
        const c = Math.cos(thigh * DEG), sn = Math.sin(thigh * DEG);
        const kx = g.A[0] * c - g.A[1] * sn, ky = g.A[0] * sn + g.A[1] * c;
        const shinAbs = Math.atan2(-(dx - kx), dy - ky) / DEG;
        const shin = shinAbs - g.thB0 - thigh;
        const rotInFrame = g.mirror ? -hipRot : hipRot;
        C['thigh_' + side + '.r'].v = thigh;
        C['shin_' + side + '.r'].v = shin;
        C['foot_' + side + '.r'].v = C['ik' + side + '.r'].v - (thigh + shin) - rotInFrame;
      }
    }

    /* ---------------- secondary dynamics (follow-through) ---------------- */
    _dynamics(dt) {
      if (dt <= 0) return;
      const C = this.ch, B = this.boneMap, d = this.dyn;
      const v = (n) => C[n].v;
      const mRoot = Mx.local(300, 708, v('mascot_root.x') + this.shakeX, v('mascot_root.y'), v('mascot_root.r'),
        Math.max(0.001, v('mascot_root.sx')), Math.max(0.001, v('mascot_root.sy')));
      const mHip = Mx.mul(mRoot, Mx.local(300, 548, v('hip.x'), v('hip.y'), v('hip.r'), 1, 1));
      const mSpine = Mx.mul(mHip, Mx.local(300, 542, v('spine.x'), v('spine.y'), v('spine.r'), v('spine.sx'), v('spine.sy')));
      const mChest = Mx.mul(mSpine, Mx.local(300, 468, 0, v('chest.y'), v('chest.r'), v('chest.sx'), v('chest.sy')));
      const mNeck = Mx.mul(mChest, Mx.local(300, 394, v('neck.x'), v('neck.y'), v('neck.r'), 1, 1));
      const h = B.head;
      const mHead = Mx.mul(mNeck, Mx.local(300, 382, v('head.x') + h.ax, v('head.y') + h.ay, v('head.r') + h.ar, v('head.sx'), v('head.sy')));
      const [hx, hy] = Mx.apply(mHead, 300, 150);
      const ang = v('mascot_root.r') + v('hip.r') + v('spine.r') + v('chest.r') + v('neck.r') + v('head.r') + h.ar;
      const [cx, cy] = Mx.apply(mChest, 300, 420);
      const cang = v('mascot_root.r') + v('hip.r') + v('spine.r') + v('chest.r');

      const lx = d.hx.step(hx, dt), ly = d.hy.step(hy, dt), la = d.ha.step(ang, dt);
      const lx2 = d.hx2.step(hx, dt), ly2 = d.hy2.step(hy, dt), la2 = d.ha2.step(ang, dt);
      const clx = d.cx.step(cx, dt), cly = d.cy.step(cy, dt), cla = d.ca.step(cang, dt);
      const g = dynGain();

      // hat follow-through: tilt + squash/stretch of the whole hat about its seat on the head,
      // so crown and band always stay together and the hat never lifts off
      B.hat.ar += clamp((la * 0.45 + lx * 0.14) * g, -10, 10);
      // soft limit (tanh) so big jumps ease into the max squash instead of flattening against it
      B.hat.asy *= 1 - 0.12 * Math.tanh((ly * 0.0015 * g) / 0.12);
      B.hat.asx *= 1 + 0.05 * Math.tanh((ly * 0.0008 * g) / 0.05);
      B.antenna_1.ar += clamp((la * 0.5 + lx * 0.2 + ly * 0.16) * g, -26, 26);
      B.antenna_2.ar += clamp(((la2 - la) * 0.7 + (lx2 - lx) * 0.3 + (ly2 - ly) * 0.22) * g, -22, 22);
      B.shoulder_cap_L.ar += clamp((cla * 0.5 + cly * 0.12 + clx * 0.1) * g, -8, 8);
      B.shoulder_cap_R.ar += clamp((-cla * 0.5 + cly * 0.12 - clx * 0.1) * g, -8, 8);
    }

    /* ---------------- render ---------------- */
    _render() {
      const C = this.ch;
      for (const b of this.bones) {
        if (!b.hasT) continue;
        const c = b.chans;
        const x = (c.x ? c.x.v : 0) + b.ax + (b.id === 'mascot_root' ? this.shakeX : 0);
        const y = (c.y ? c.y.v : 0) + b.ay;
        const r = (c.r ? c.r.v : 0) + b.ar;
        let sx = (c.sx ? c.sx.v : 1) * b.asx;
        let sy = (c.sy ? c.sy.v : 1) * b.asy;
        if (b.id === 'mascot_root' || b.id === 'eye_L' || b.id === 'eye_R' || b.id === 'mouth') { sx = Math.max(0, sx); sy = Math.max(0, sy); }
        b.el.setAttribute('transform',
          `translate(${f3(b.px + x)} ${f3(b.py + y)}) rotate(${f3(r)}) scale(${f3(sx)} ${f3(sy)}) translate(${-b.px} ${-b.py})`);
      }
      const op = (n) => f3(clamp(C[n].v, 0, 1));
      const B = this.boneMap, E = this.el;
      B.mascot_root.el.setAttribute('opacity', op('mascot_root.op'));
      B.brow_L.el.setAttribute('opacity', op('brow_L.op'));
      B.brow_R.el.setAttribute('opacity', op('brow_R.op'));
      E.cheekL.setAttribute('opacity', op('face.cheeks'));
      E.cheekR.setAttribute('opacity', op('face.cheeks'));
      E.tint.setAttribute('opacity', f3(clamp(C['face.tint'].v, 0, 1) * 0.55));
      E.dim.setAttribute('opacity', op('face.dim'));
      E.badgeGlow.setAttribute('opacity', f3(clamp(C['glow.badge'].v, 0, 1) * 0.9));
      E.antennaGlow.setAttribute('opacity', op('glow.antenna'));
      E.earGlowL.setAttribute('opacity', op('glow.earL'));
      E.earGlowR.setAttribute('opacity', op('glow.earR'));

      E.lidL.setAttribute('d', lidPath(C['lid.topL'].v, C['lid.angL'].v, C['lid.botL'].v, 1));
      E.lidR.setAttribute('d', lidPath(C['lid.topR'].v, C['lid.angR'].v, C['lid.botR'].v, -1));

      if (this.mouthStyle === 'dots') {
        const t = this.time / 1000;
        this.mouthDots.forEach((dot, i) => dot.setAttribute('cy', f3(-6 * Math.max(0, Math.sin(t * TAU * 1.4 - i * 0.75)))));
      }

      // ground shadow follows the jump height
      const ry = C['mascot_root.y'].v;
      const rsx = clamp(C['mascot_root.sx'].v, 0, 1.3);
      const s = clamp(1 + ry / 300, 0.3, 1.1);
      E.shadow.setAttribute('transform', `translate(${f3(300 + C['mascot_root.x'].v)} 709) scale(${f3(s * rsx)} ${f3(s)}) translate(-300 -709)`);
      E.shadow.setAttribute('opacity', f3(0.16 * s * Math.min(1, rsx) * clamp(C['mascot_root.op'].v, 0, 1)));
    }

    /* ---------------- rig overlay ---------------- */
    _buildRig() {
      const ov = this._byId('rig_overlay');
      this.el.rig = ov;
      if (!ov) return;
      const gl = mk('g', null, ov), gd = mk('g', null, ov), gi = mk('g', null, ov), gt = mk('g', null, ov);
      const COL = { core: '#12A4C9', squash: '#F08A1C', secondary: '#8A4DFF', ik: '#1DAA6A', face: '#E0457B' };
      for (const b of this.bones) {
        const col = COL[b.kind] || COL.core;
        b.rig = {
          line: b.parent ? mk('line', { stroke: col, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.9,
            'stroke-dasharray': b.kind === 'secondary' ? '5 4' : b.kind === 'ik' ? '2 4' : 'none' }, gl) : null,
          dot: mk('circle', { r: b.kind === 'face' ? 3.4 : 5.2, fill: '#fff', stroke: col, 'stroke-width': 2.6 }, gd),
          label: mk('text', { fill: col }, gt),
        };
        if (b.kind === 'squash') mk('circle', { r: 9, fill: 'none', stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '2 2', class: 'sq-ring' }, gd);
        b.rig.label.textContent = b.id;
      }
      this.rigSqRings = [...gd.querySelectorAll('.sq-ring')];
      this.rigIK = ['L', 'R'].map(() => mk('path', { d: 'M-9 0H9M0-9V9', stroke: '#1DAA6A', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, gi));
      ov.setAttribute('display', 'none');
    }

    _updateRig() {
      const ov = this.el.rig;
      if (!ov) return;
      const base = ov.getScreenCTM();
      if (!base) return;
      const inv = base.inverse();
      for (const b of this.bones) {
        const m = inv.multiply(b.el.getScreenCTM());
        const p = new DOMPoint(b.px, b.py).matrixTransform(m);
        b.wx = p.x; b.wy = p.y;
      }
      let qi = 0;
      for (const b of this.bones) {
        const r = b.rig;
        r.dot.setAttribute('cx', f3(b.wx)); r.dot.setAttribute('cy', f3(b.wy));
        if (b.kind === 'squash' && this.rigSqRings[qi]) {
          this.rigSqRings[qi].setAttribute('cx', f3(b.wx)); this.rigSqRings[qi].setAttribute('cy', f3(b.wy)); qi++;
        }
        if (r.line) {
          const pb = this.boneMap[b.parent];
          if (pb) {
            r.line.setAttribute('x1', f3(pb.wx)); r.line.setAttribute('y1', f3(pb.wy));
            r.line.setAttribute('x2', f3(b.wx)); r.line.setAttribute('y2', f3(b.wy));
          }
        }
      }
      // labels: stack labels whose pivots coincide so they stay readable
      if (this.rigLabels) {
        const placed = [];
        for (const b of this.bones) {
          let lx = b.wx + 7, ly = b.wy - 7;
          for (let guard = 0; guard < 6; guard++) {
            if (!placed.some((p) => Math.abs(p[0] - lx) < 58 && Math.abs(p[1] - ly) < 10)) break;
            ly += 11;
          }
          placed.push([lx, ly]);
          b.rig.label.setAttribute('x', f3(lx)); b.rig.label.setAttribute('y', f3(ly));
        }
      }
      const mr = inv.multiply(this.boneMap.mascot_root.el.getScreenCTM());
      ['L', 'R'].forEach((s, i) => {
        const g = this.legGeo[s];
        if (!g) return;
        const p = new DOMPoint(g.rest[0] + g.out * this.ch['ik' + s + '.x'].v, g.rest[1] + this.ch['ik' + s + '.y'].v).matrixTransform(mr);
        this.rigIK[i].setAttribute('transform', `translate(${f3(p.x)} ${f3(p.y)})`);
      });
    }

    showRig(on) {
      this.rigOn = !!on;
      if (this.el.rig) this.el.rig.setAttribute('display', on ? 'inline' : 'none');
      this.svg.classList.toggle('rig-on', !!on);
      if (on) this._updateRig();
      return this;
    }
    showRigLabels(on) {
      this.rigLabels = !!on;
      for (const b of this.bones) if (b.rig) b.rig.label.setAttribute('display', on ? 'inline' : 'none');
      return this;
    }
  }

  // Eyelid clip polygon in eye-local space. side: +1 left eye (inner = +x), −1 right eye.
  function lidPath(top, ang, bot, side) {
    const yT = -44 + clamp(top, 0, 1.2) * 44;
    const yB = 44 - clamp(bot, 0, 1.2) * 44;
    const s = Math.tan(clamp(ang, -40, 40) * DEG) * side;
    const X = 60;
    return `M${-X} ${f3(yT - s * X)}L${X} ${f3(yT + s * X)}L${X} ${f3(yB)}L${-X} ${f3(yB)}Z`;
  }

  /* ======================================================================
   * 8. FX — small, self-cleaning SVG effects
   *    Each effect returns { node?, update(t, dt) → false when finished }.
   *    `bound` / `loop` effects end (animate out) when the body state changes.
   * ==================================================================== */
  const NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const STAR4 = 'M0-1C.14-.32.32-.14 1 0C.32.14.14.32 0 1C-.14.32-.32.14-1 0C-.32-.14-.14-.32 0-1Z';
  const tf = (x, y, r, s, sy) => `translate(${f3(x)} ${f3(y)}) rotate(${f3(r || 0)}) scale(${f3(s == null ? 1 : s)} ${f3(sy == null ? (s == null ? 1 : s) : sy)})`;

  class FXManager {
    constructor(m) {
      this.m = m;
      this.items = [];
      this.layers = { back: m._byId('fx_back'), front: m._byId('fx_front'), head: m._byId('fx_head') };
    }
    play(spec) {
      const o = typeof spec === 'string' ? { name: spec } : Object.assign({}, spec);
      const make = FX_LIB[o.name];
      if (!make) { console.warn('[mascot] unknown fx', o.name); return null; }
      while (this.items.length > 36) this._drop(0); // rapid-click guard
      const it = make(this, o, SETTINGS.reduced);
      if (!it) return null;
      it.t = 0; it.relT = 0; it.release = false;
      it.stateBound = !!(o.bound || o.loop);
      this.items.push(it);
      it.update(0, 0);
      return it;
    }
    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.t += dt;
        if (it.release) it.relT += dt;
        if (it.update(it.t, dt) === false) this._drop(i);
      }
    }
    _drop(i) {
      const it = this.items[i];
      this.items.splice(i, 1);
      if (it.node) it.node.remove();
      if (it.done) it.done();
    }
    releaseState() { for (const it of this.items) if (it.stateBound) it.release = true; }
    clear() { while (this.items.length) this._drop(this.items.length - 1); }
    root() { const c = this.m.ch; return [c['mascot_root.x'].v, c['mascot_root.y'].v]; }
  }

  // shared out-animation for bound / timed marks
  function outProgress(it, o, t, hold) {
    if (it.release) return clamp(it.relT / 180, 0, 1);
    if (!o.bound && t > hold) return clamp((t - hold) / 180, 0, 1);
    return 0;
  }

  const FX_LIB = {
    sparkles(fx, o, reduced) {
      const g = mk('g', null, fx.layers.front);
      const [rx, ry] = fx.root();
      const n = reduced ? Math.min(3, o.n || 6) : (o.n || 6);
      const cx = (o.x != null ? o.x : 300) + rx, cy = (o.y != null ? o.y : 320) + ry, R = o.r || 190;
      const parts = [];
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), rr = rand(R * 0.55, R);
        const p = mk('path', { d: STAR4, fill: i % 3 === 2 ? '#FFFFFF' : '#FFC93C', stroke: '#F2A81D', 'stroke-width': 0.09, opacity: 0 }, g);
        parts.push({ p, x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.75, s: rand(9, 17), d: i * 55 + rand(0, 60), r0: rand(-20, 20) });
      }
      return {
        node: g,
        update(t) {
          let alive = false;
          for (const q of parts) {
            const lt = (t - q.d) / 650;
            if (lt < 0) { alive = true; continue; }
            if (lt > 1) { q.p.setAttribute('opacity', 0); continue; }
            alive = true;
            let s = q.s, op = 1;
            if (reduced) op = Math.sin(lt * Math.PI);
            else s = q.s * (lt < 0.35 ? EASE.outBack(lt / 0.35) : 1 - EASE.inQuad((lt - 0.35) / 0.65));
            q.p.setAttribute('opacity', f3(op));
            q.p.setAttribute('transform', tf(q.x, q.y, reduced ? 0 : q.r0 + lt * 80, Math.max(0, s)));
          }
          return alive;
        },
      };
    },

    confetti(fx, o, reduced) {
      if (reduced) return FX_LIB.sparkles(fx, { n: 3, y: 300 }, true);
      const g = mk('g', null, fx.layers.front);
      const [rx, ry] = fx.root();
      const cols = ['#8EEBFF', '#7A4DFF', '#FFC93C', '#3D8BFF', '#FF7AB6', '#5BE3B0'];
      const P = [];
      const n = o.n || 28;
      for (let i = 0; i < n; i++) {
        const w = rand(7, 12), h = rand(4, 6);
        const p = mk('rect', { x: f3(-w / 2), y: f3(-h / 2), width: f3(w), height: f3(h), rx: 1.6, fill: cols[i % cols.length] }, g);
        P.push({ p, x: (o.x != null ? o.x : 300) + rx + rand(-30, 30), y: (o.y != null ? o.y : 330) + ry + rand(-20, 20),
          vx: rand(-340, 340), vy: rand(-660, -320), r: rand(0, 360), vr: rand(-720, 720), ph: rand(0, TAU), life: rand(1200, 1750) });
      }
      return {
        node: g,
        update(t, dt) {
          const s = dt / 1000;
          let alive = false;
          for (const q of P) {
            if (t > q.life) { q.p.setAttribute('opacity', 0); continue; }
            alive = true;
            q.vy = Math.min(q.vy + 1150 * s, 420);
            q.vx *= Math.pow(0.35, s);
            q.x += q.vx * s; q.y += q.vy * s; q.r += q.vr * s;
            q.p.setAttribute('transform', `translate(${f3(q.x)} ${f3(q.y)}) rotate(${f3(q.r)}) scale(1 ${f3(Math.cos(t * 0.012 + q.ph))})`);
            q.p.setAttribute('opacity', f3(t > q.life * 0.7 ? 1 - (t - q.life * 0.7) / (q.life * 0.3) : 1));
          }
          return alive;
        },
      };
    },

    exclaim(fx, o, reduced) {
      const g = mk('g', { opacity: 0 }, fx.layers.head);
      mk('rect', { x: -7.5, y: -40, width: 15, height: 36, rx: 7.5, fill: '#FFC93C', stroke: '#E09A12', 'stroke-width': 3 }, g);
      mk('circle', { cx: 0, cy: 10, r: 8, fill: '#FFC93C', stroke: '#E09A12', 'stroke-width': 3 }, g);
      const lines = mk('path', { d: 'M-20-30L-31-40M20-30L31-40M-24-10L-37-12', stroke: '#FFC93C', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, g);
      const x = o.x != null ? o.x : 412, y = o.y != null ? o.y : 96, hold = o.hold || 1300;
      return {
        node: g,
        update(t) {
          let s = 1, r = 0, op = 1;
          if (reduced) op = clamp(t / 200, 0, 1);
          else {
            s = t < 260 ? EASE.outBack(clamp(t / 260, 0, 1)) : 1;
            r = Math.sin(t * 0.03) * 12 * Math.exp(-t / 380);
          }
          const out = outProgress(this, o, t, hold);
          if (out > 0) { if (reduced) op *= 1 - out; else s *= 1 - EASE.inQuad(out); if (out >= 1) return false; }
          lines.setAttribute('opacity', f3(clamp(1 - (t - 280) / 380, 0, 1)));
          g.setAttribute('transform', tf(x, y, r, Math.max(0, s)));
          g.setAttribute('opacity', f3(op));
          return true;
        },
      };
    },

    question(fx, o, reduced) {
      const g = mk('g', { opacity: 0 }, fx.layers.head);
      const tx = mk('text', { x: 0, y: 22, 'text-anchor': 'middle', 'font-size': 68, 'font-weight': 900, fill: '#FFC93C', stroke: '#fff', 'stroke-width': 6,
        'paint-order': 'stroke', 'font-family': 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif' }, g);
      tx.textContent = '?';
      const x = o.x != null ? o.x : 150, y = o.y != null ? o.y : 128, hold = o.hold || 2200;
      return {
        node: g,
        update(t) {
          let s = reduced ? 1 : EASE.outBack(clamp(t / 280, 0, 1));
          let op = reduced ? clamp(t / 250, 0, 1) : 1;
          const bob = reduced ? 0 : Math.sin(t * 0.004) * 6;
          const rot = reduced ? 0 : -12 + Math.sin(t * 0.0032) * 9;
          const out = outProgress(this, o, t, hold);
          if (out > 0) { s *= 1 - out; op *= 1 - out; if (out >= 1) return false; }
          g.setAttribute('transform', tf(x, y + bob, rot, Math.max(0, s)));
          g.setAttribute('opacity', f3(op));
          return true;
        },
      };
    },

    ring(fx, o, reduced) {
      const g = mk('g', null, fx.layers.back);
      const rings = [];
      let spawnT = 0, count = 0;
      const max = o.loop ? Infinity : (o.n || 3);
      const period = reduced ? 1000 : 520, life = 1150;
      return {
        node: g,
        update(t) {
          const [rx, ry] = fx.root();
          if (!this.release && count < max && t >= spawnT) {
            rings.push({ c: mk('circle', { fill: 'none', stroke: '#FFB23E' }, g), t0: t });
            count++; spawnT = t + period;
          }
          for (let i = rings.length - 1; i >= 0; i--) {
            const R = rings[i];
            const p = (t - R.t0) / life;
            if (p >= 1) { R.c.remove(); rings.splice(i, 1); continue; }
            R.c.setAttribute('cx', f3(300 + rx)); R.c.setAttribute('cy', f3(440 + ry));
            R.c.setAttribute('r', f3(reduced ? 160 : 70 + EASE.outCubic(p) * 200));
            R.c.setAttribute('stroke-width', f3(7 * (1 - p) + 1));
            R.c.setAttribute('opacity', f3((reduced ? 0.22 : 0.55) * (1 - p)));
          }
          return rings.length > 0 || (!this.release && count < max);
        },
      };
    },

    steam(fx, o, reduced) {
      const g = mk('g', null, fx.layers.head);
      const CLOUD = 'M-14 6C-24 6-24-8-13-8C-11-18 3-20 7-12C15-18 27-10 21-2C29 2 25 14 15 12C11 18-3 18-6 12C-10 15-15 11-14 6Z';
      const puffs = [0, 1].map((i) => ({ p: mk('path', { d: CLOUD, fill: '#FFFFFF', stroke: '#9DB8FF', 'stroke-width': 2.5, opacity: 0 }, g), d: i * 140 }));
      const x = o.x != null ? o.x : 138, y = o.y != null ? o.y : 234;
      return {
        node: g,
        update(t) {
          let alive = false;
          for (const q of puffs) {
            const p = (t - q.d) / 700;
            if (p < 0) { alive = true; continue; }
            if (p > 1) { q.p.setAttribute('opacity', 0); continue; }
            alive = true;
            const e = EASE.outCubic(p);
            q.p.setAttribute('transform', tf(x - (reduced ? 0 : e * 36) - q.d * 0.05, y - e * 12 + q.d * 0.08, 0, reduced ? 0.9 : 0.5 + e * 0.7));
            q.p.setAttribute('opacity', f3(p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85));
          }
          return alive;
        },
      };
    },

    sweat(fx, o, reduced) {
      const g = mk('g', { opacity: 0 }, fx.layers.head);
      mk('path', { d: 'M0-13C5-5 10 1 10 7C10 13 5 16 0 16C-5 16-10 13-10 7C-10 1-5-5 0-13Z', fill: '#AEEFFF', stroke: '#3D8BFF', 'stroke-width': 2.5 }, g);
      mk('ellipse', { cx: -3, cy: 6, rx: 2.5, ry: 4, fill: '#fff', opacity: 0.8 }, g);
      const x = o.x != null ? o.x : 440, y = o.y != null ? o.y : 196;
      return {
        node: g,
        update(t) {
          const p = t / 1000;
          if (p >= 1) return false;
          const s = reduced ? 1 : EASE.outBack(clamp(t / 180, 0, 1));
          g.setAttribute('transform', tf(x, y + (reduced ? 0 : EASE.inQuad(p) * 30), 0, s));
          g.setAttribute('opacity', f3(p > 0.7 ? 1 - (p - 0.7) / 0.3 : reduced ? clamp(t / 200, 0, 1) : 1));
          return true;
        },
      };
    },

    check(fx, o, reduced) {
      const g = mk('g', { opacity: 0 }, fx.layers.head);
      mk('circle', { r: 22, fill: '#22C79A', stroke: '#fff', 'stroke-width': 4 }, g);
      mk('path', { d: 'M-10 1L-3 8L11-7', stroke: '#fff', 'stroke-width': 5.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, g);
      const x = o.x != null ? o.x : 426, y = o.y != null ? o.y : 92;
      return {
        node: g,
        update(t) {
          if (t > 1100) return false;
          let s = reduced ? 1 : EASE.outBack(clamp(t / 260, 0, 1));
          let op = reduced ? clamp(t / 200, 0, 1) : 1;
          if (t > 900) { const p = (t - 900) / 200; if (reduced) op *= 1 - p; else s *= 1 - EASE.inQuad(p); }
          g.setAttribute('transform', tf(x, y - (reduced ? 0 : EASE.outCubic(clamp(t / 900, 0, 1)) * 10), 0, Math.max(0, s)));
          g.setAttribute('opacity', f3(op));
          return true;
        },
      };
    },

    dust(fx, o, reduced) {
      if (reduced) return null;
      const g = mk('g', null, fx.layers.back);
      const [rx] = fx.root();
      const P = [];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          P.push({ c: mk('circle', { r: 1, fill: '#E3E7F6', stroke: '#C9CFEA', 'stroke-width': 2, opacity: 0 }, g),
            x: 300 + rx + side * rand(48, 70), y: 702 - rand(0, 6), dx: side * rand(26, 54), dy: -rand(6, 18), r: rand(9, 15), d: i * 30 });
        }
      }
      return {
        node: g,
        update(t) {
          let alive = false;
          for (const q of P) {
            const p = (t - q.d) / 460;
            if (p < 0) { alive = true; continue; }
            if (p > 1) { q.c.setAttribute('opacity', 0); continue; }
            alive = true;
            const e = EASE.outCubic(p);
            q.c.setAttribute('cx', f3(q.x + q.dx * e)); q.c.setAttribute('cy', f3(q.y + q.dy * e));
            q.c.setAttribute('r', f3(q.r * (0.4 + 0.8 * e)));
            q.c.setAttribute('opacity', f3(0.95 * (1 - p)));
          }
          return alive;
        },
      };
    },

    lines(fx, o, reduced) {
      if (reduced) return null;
      const g = mk('g', null, fx.layers.back);
      const [rx, ry] = fx.root();
      const L = [-36, 0, 36].map((dx, i) => ({ l: mk('line', { stroke: '#B9C1EA', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 }, g), x: 300 + rx + dx, d: i * 30 }));
      return {
        node: g,
        update(t) {
          let alive = false;
          for (const q of L) {
            const p = (t - q.d) / 380;
            if (p < 0) { alive = true; continue; }
            if (p > 1) { q.l.setAttribute('opacity', 0); continue; }
            alive = true;
            const y0 = 652 + ry + EASE.outCubic(p) * 50;
            q.l.setAttribute('x1', f3(q.x)); q.l.setAttribute('x2', f3(q.x));
            q.l.setAttribute('y1', f3(y0)); q.l.setAttribute('y2', f3(y0 + 46 * (1 - p)));
            q.l.setAttribute('opacity', f3(1 - p));
          }
          return alive;
        },
      };
    },

    burst(fx, o, reduced) {
      const g = mk('g', null, fx.layers.head);
      const x = o.x != null ? o.x : 180, y = o.y != null ? o.y : 116;
      const angs = [-165, -132, -100];
      const L = angs.map(() => mk('line', { stroke: '#FFC93C', 'stroke-width': 6, 'stroke-linecap': 'round' }, g));
      return {
        node: g,
        update(t) {
          const p = t / 520;
          if (p >= 1) return false;
          const e = reduced ? 0.5 : EASE.outCubic(p);
          L.forEach((l, i) => {
            const a = angs[i] * DEG, r0 = 12 + e * 20, r1 = r0 + 18 * (1 - p * 0.6);
            l.setAttribute('x1', f3(Math.cos(a) * r0)); l.setAttribute('y1', f3(Math.sin(a) * r0));
            l.setAttribute('x2', f3(Math.cos(a) * r1)); l.setAttribute('y2', f3(Math.sin(a) * r1));
          });
          g.setAttribute('transform', `translate(${x} ${y})`);
          g.setAttribute('opacity', f3(p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1));
          return true;
        },
      };
    },

    poof(fx, o, reduced) {
      const g = mk('g', null, fx.layers.front);
      const [rx, ry] = fx.root();
      const cx = 300 + rx, cy = 520 + ry;
      const P = [];
      for (let i = 0; i < 8; i++) P.push({ c: mk('circle', { r: 8, fill: '#EEE8FF', stroke: '#B79CFF', 'stroke-width': 2 }, g), a: (i / 8) * TAU + 0.2 });
      fx.play({ name: 'sparkles', n: 5, y: 520 - (o.lift || 0), r: 120 });
      return {
        node: g,
        update(t) {
          const p = t / 480;
          if (p >= 1) return false;
          const e = reduced ? 0.4 : EASE.outCubic(p);
          for (const q of P) {
            q.c.setAttribute('cx', f3(cx + Math.cos(q.a) * (16 + e * 70)));
            q.c.setAttribute('cy', f3(cy + Math.sin(q.a) * (16 + e * 60)));
            q.c.setAttribute('r', f3(10 * (1 - p) + 2));
            q.c.setAttribute('opacity', f3(1 - p));
          }
          return true;
        },
      };
    },

    glint(fx) {
      const el = fx.m.el.glint;
      if (!el) return null;
      return {
        update(t) {
          const p = t / 560;
          if (p >= 1) { el.setAttribute('opacity', 0); return false; }
          el.setAttribute('transform', `translate(${f3(-170 + p * 340)} 0)`);
          el.setAttribute('opacity', f3(Math.sin(p * Math.PI) * 0.22));
          return true;
        },
      };
    },

    badgeShine(fx) {
      const el = fx.m.el.shine;
      if (!el) return null;
      return {
        update(t) {
          const p = t / 620;
          if (p >= 1) { el.setAttribute('opacity', 0); return false; }
          el.setAttribute('transform', `translate(${f3(-50 + EASE.inOutSine(p) * 100)} 0)`);
          el.setAttribute('opacity', f3(Math.sin(p * Math.PI) * 0.85));
          return true;
        },
      };
    },
  };

  /* ======================================================================
   * 9. Public exports
   * ==================================================================== */
  window.ThinkSecureMascot = { Mascot, STATES, EXPRESSIONS, BONES, SPRING, FIDGETS, SETTINGS };

  /* ======================================================================
   * 10. MOTION LAB UI (only runs when the lab markup is present)
   * ==================================================================== */
  function initLab() {
    const svg = document.getElementById('mascot_svg');
    if (!svg) return;
    const mascot = new Mascot(svg);
    window.mascot = mascot;

    const $ = (id) => document.getElementById(id);
    const stage = $('stage');
    const stateBtns = [...document.querySelectorAll('[data-state]')];
    const faceBtns = [...document.querySelectorAll('[data-expr]')];
    const cards = { left: $('cardLeft'), right: $('cardRight'), cta: $('demoCta') };
    const live = $('live');

    stateBtns.forEach((b) => b.addEventListener('click', () => mascot.play(b.dataset.state)));
    faceBtns.forEach((b) => b.addEventListener('click', () => mascot.setExpression(b.dataset.expr)));

    mascot.on('state', (e) => {
      const active = e.hidden ? 'pop_out' : e.name;
      stateBtns.forEach((b) => {
        const on = b.dataset.state === active;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $('stBody').textContent = e.hidden ? 'hidden' : e.label.toLowerCase();
      for (const k in cards) {
        cards[k].classList.toggle('is-target', e.target === k);
        cards[k].classList.toggle('is-warning', e.target === k && e.warn);
      }
      $('hiddenHint').classList.toggle('show', !!e.hidden);
      if (live) live.textContent = 'Mascot: ' + (e.hidden ? 'hidden' : e.label);
    });
    mascot.on('expression', (e) => {
      faceBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.expr === e.name));
      $('stFace').textContent = e.label;
    });

    // look target — pointer anywhere over the stage
    stage.addEventListener('pointermove', (ev) => mascot.lookAtClient(ev.clientX, ev.clientY));
    stage.addEventListener('pointerleave', () => mascot.clearPointerLook());

    // sliders
    const speed = $('speed'), speedOut = $('speedOut');
    const syncSpeed = () => { mascot.setSpeed(+speed.value); speedOut.textContent = (+speed.value).toFixed(2) + '×'; };
    speed.addEventListener('input', syncSpeed); syncSpeed();
    const inten = $('intensity'), intOut = $('intOut');
    const syncInt = () => {
      const s = +inten.value;
      mascot.setIntensity(0.25 + (s / 100) * 1.15);
      intOut.textContent = s < 25 ? 'subtle' : s > 80 ? 'expressive' : String(s);
    };
    inten.addEventListener('input', syncInt); syncInt();

    // toggles
    $('tLook').addEventListener('change', (e) => mascot.setPointerLook(e.target.checked));
    const tRig = $('tRig'), tLabels = $('tLabels');
    const syncRig = () => {
      mascot.showRig(tRig.checked);
      mascot.showRigLabels(tLabels.checked);
      tLabels.disabled = !tRig.checked;
      $('rigLegend').hidden = !tRig.checked;
    };
    tRig.addEventListener('change', syncRig); tLabels.addEventListener('change', syncRig); syncRig();
    $('tFidget').addEventListener('change', (e) => mascot.setFidgets(e.target.checked));

    const tReduced = $('tReduced');
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const applyReduced = (on) => { tReduced.checked = on; mascot.setReducedMotion(on); };
    applyReduced(!!(mq && mq.matches));
    tReduced.addEventListener('change', () => mascot.setReducedMotion(tReduced.checked));
    if (mq && mq.addEventListener) mq.addEventListener('change', (e) => applyReduced(e.matches));

    $('bReplay').addEventListener('click', () => mascot.play(mascot.hidden ? 'pop_in' : mascot.lastRequested));
    $('bReset').addEventListener('click', () => mascot.reset());

    // status readout (throttled)
    let acc = 0;
    let lastLook = '';
    mascot.on('tick', (m) => {
      if (++acc % 6) return;
      const st = m.state;
      const d = st.def;
      const tLabel = d.dur ? `${(Math.min(st.t, d.dur) / 1000).toFixed(2)} / ${(d.dur / 1000).toFixed(2)}s` : `${(st.t / 1000).toFixed(2)}s ↻`;
      $('stTime').textContent = d.hiddenState ? '—' : tLabel;
      if (m.lookSource !== lastLook) { lastLook = m.lookSource; $('stLook').textContent = lastLook; }
    });

    // sync the UI with the initial state (events fired before listeners existed)
    mascot.setExpression('neutral', { instant: true });
    mascot.play('idle');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLab);
  else initLab();
})();
