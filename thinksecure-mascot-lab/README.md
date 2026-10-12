# ThinkSecure Mascot Motion Lab

A working prototype of the ThinkSecure security-robot mascot as a **fully articulated inline-SVG character**, driven by a small **spring-based pose-to-pose animation system** in vanilla JavaScript. No frameworks and no canvas: every body part is a named `<g>` you can inspect in DevTools.

```
thinksecure-mascot-lab/
  index.html   – lab page + the complete mascot SVG (rig hierarchy)
  styles.css   – lab UI styling
  mascot.js    – rig config, state choreography, runtime, FX, rig overlay, lab UI
  README.md
```

## Character model v2 (pending approval)

`model.html` is the design-correction pass: a static, corrected mascot model rebuilt from the turnaround reference. It has:

- silhouette, proportion-guide, joint-pivot and dark-background review views
- the new screen-face language sheet
- a reference / v1 / v2 comparison with measured proportions

The motion lab (`index.html`) runs your adjusted model. `mascot.svg` is a standalone export of that model in its rest pose. Supporting files for the review page are `model.css`, `model.js` and `reference/turnaround.webp`.

## Running it

Double-click `index.html`. It works from `file://`. The Nunito web font loads from Google Fonts when online and falls back to system fonts offline.

Optionally, serve it locally:

```bash
python3 -m http.server 5178
```

In the browser console, `window.mascot` is the live instance (see **Public API**).

---

## 1. How the SVG rig is structured

All art is drawn in one rest-pose coordinate space (`viewBox 0 0 600 700`, ground at y≈666). Each articulated part is a `<g id="…">`. JavaScript writes one `transform` per bone per frame:

```
translate(pivot + offset) rotate(r) scale(sx, sy) translate(-pivot)
```

Children inherit their parents' transforms, so the rig is a true hierarchy.

```
mascot_root            pivot = ground centre (300,666)   overall squash / jump / pop
└─ hip                 pelvis centre                     crouch / weight shift
   ├─ leg_L ─ thigh_L ─ shin_L ─ foot_L ─ toe_L          2-bone IK (feet stay planted)
   ├─ leg_R  (mirrored copy)
   ├─ pelvis
   └─ spine            top of pelvis                     torso squash & stretch
      └─ chest         mid torso                         lean, breathing
         ├─ chest_badge                                  glow + shine sweep
         ├─ arm_L_slot ─ shoulder_L ─ upper_arm_L ─ forearm_L ─ hand_L (5 glove swaps)
         │                          └─ shoulder_cap_L (SAPOL pad, secondary motion)
         ├─ arm_R_slot ─ (mirrored copy)
         └─ neck       collar
            ├─ head    BOTTOM of the head shell          tilts feel like a neck bend
            │  ├─ face (screen contents, clipped to the screen)
            │  │  ├─ eye_L / eye_R  (5 eye shapes, pupils, lid clip-paths)
            │  │  ├─ brow_L / brow_R, cheek_L / cheek_R
            │  │  └─ mouth          (10 mouth shapes)
            │  ├─ hat ─ hat_crown   (floppy follow-through)
            │  ├─ antenna ─ antenna_1 ─ antenna_2 ─ antenna_tip
            │  └─ ear_L / ear_R
            └─ fx_head  (FX that follow the body but not the head squash)
```

**Conventions**

- `_L` / `_R` mean **screen-left / screen-right** (the viewer's left and right).
- The right arm and right leg live inside a static `matrix(-1 0 0 1 600 0)` mirror. Pose values therefore use the same convention on both sides: **positive arm rotation means outward/up** and **positive IK `x` means outward**. Authoring stays symmetric. The SAPOL text on the right pad is counter-flipped so it never reads backwards.
- Limb art is defined once in `<defs>` (`#art_upper_arm`, `#art_hand_open`, …) and shared through `<use>`.
- Joints are drawn as overlapping navy balls under the white segments, so no gaps show at any rotation.
- Bone config (parent, pivot, channels, kind, lag) lives in `BONES` in `mascot.js`. Each pivot is given in the parent's user space.

**What deforms and what stays rigid**

| Kind | Bones | Behaviour |
|---|---|---|
| squash | `mascot_root`, `spine`, `chest`, `head`, `hat` | scale X/Y (volume-preserving pairs) |
| core (rigid) | `hip`, `neck`, `shoulder_*`, `upper_arm_*`, `forearm_*`, `hand_*`, ears | rotate / translate only. Limbs never stretch. |
| secondary | `hat_crown`, `antenna_*`, `shoulder_cap_*` | driven by follow-through dynamics |
| ik | `thigh_*`, `shin_*`, `foot_*` | solved every frame from foot targets |
| face | `face`, eyes, brows, mouth | the expression system |

Toggle **Show Rig** in the lab to see every pivot, bone line, label, squash ring and IK target live.

---

## 2. Runtime architecture

Every animated number is a **spring channel**: `target = base (pose/tween) + add (procedural)`. The channel integrates with fixed 1/240 s sub-steps. The independent layers are combined each frame:

| Layer | What it does |
|---|---|
| **BODY STATE** | Timelines of poses (`STATES`). Each step sets spring targets for bones. |
| **FACE STATE** | `setExpression()` sets eye shape, lids, brows, mouth, cheeks, screen tint. It is independent of the body. |
| **LOOK TARGET** | Priority order: state look › expression look › `lookAt()` API › pointer › idle wander. Eye springs are stiff and head springs are soft, so **the eyes lead and the head follows**. |
| **BLINK** | Random blinks, plus "blink cuts" that hide eye-shape swaps, like an LED screen refreshing. |
| **FX** | Self-cleaning SVG effects: sparkles, confetti, `!`, `?`, alert rings, steam, sweat, check, dust, motion lines, poof, glint, badge shine. |
| **SECONDARY** | Lagging followers on the head and chest drive the hat, crown, antenna (2 segments, so it whips) and shoulder caps. |
| **IK** | Two-bone leg IK keeps the boots planted while the hip crouches or sways. |

Frame order: timeline → procedural adds → look → blink → springs → shake → look/face extras → IK → dynamics → FX → render → rig overlay.

### Motion principles in code

- **Face leads the body.** In each step, `face` / `look` / `fx` fire at `at`, and `pose` fires at `at + lead` (default 60 ms).
- **Overlapping action.** Every bone has a `lag` (hip 0 → spine 15 → chest 30 → neck 50 → head 70 → hat 95; upper arm 35 → forearm 70 → hand 100 ms). A single pose step therefore ripples outward instead of moving all parts at once. A state's `stagger` scales this: alert uses 0.55 (snappy) and sad uses 1.6 (heavy).
- **Spring profiles** (`SPRING`): `bouncy` (happy rebounds), `snappy` / `firm` (warning settles fast), `soft` (sad, ζ = 1, no rebound), `track` (follows eased tweens for jump arcs).
- **Arcs and jumps.** A pose value of `[target, ms, ease]` tweens the target. Jumps use `outQuad` up and `inQuad` down, so they follow a gravity-like path, then a bouncy landing squash.
- **Draw-order swaps.** An arm moves in front of the head for waves, salutes, chin and ear poses. It only moves back once the hand has dropped below the chin, so it never pops behind the head.

### Animation states (all in `STATES`)

| State | Type | Choreography |
|---|---|---|
| idle | loop | breathing (spine/chest/head phase-offset), slow sway, antenna drift, random blinks, idle look-wander, rare fidgets (glance, antenna boop, mini bounce, weight shift) |
| wave | 1.75 s | anticipation dip → arm swings out (moves in front) → 2½ decaying wave cycles → settle. Body counter-leans, head tilts the other way. |
| celebrate | 2.2 s | strong crouch → stretch launch → airborne tuck with fists up + confetti → landing squash + dust → two diminishing rebounds |
| point_left / point_right | 1.85 s | eyes snap to the target → head follows → arm winds back → extends with overshoot → "tap tap" → release. The other hand rests on the hip. |
| think | loop | hand to chin, head tilt, eyes up-right, mouth turns into loading dots, antenna pulses |
| alert | loop | backward anticipation → 3-frame snap into a traffic-cop "stop" hand + wide stance → decaying shake → `!` + amber rings. Firm, never threatening (no red eyes). |
| confused | loop | head tilt, shrug with palms up, uneven eyes, bobbing `?`. Tilts alternate with asymmetric timing (fast one way, slow back). |
| sad | loop | slow tween sink (head lowers, shoulders and torso sink, antenna droops, hat slides), screen dims, slow sighs. No overshoot. |
| success | 2.05 s | dip → chest lifts, chin up, thumbs-up, other hand on hip → badge glow + shine sweep + sparkles |
| listen | loop | leans in, hand cupped to the right ear pod, ear-ring glow pulse, small irregular nods |
| scam | 3.4 s | eyes snap to the suspicious card (surprised) → suspicious hand-to-chin → determined → anticipation → crossed-arm warning with `!`, steam puff, ring, shake |
| correct | 0.76 s | small hop with fist pump + check mark (much shorter than celebrate) |
| wrong | 2.3 s | concerned recoil → gentle head shake + sweat drop → **encouraging** face, fist and nod → idle. No shaming. |
| nudge | 0.95 s | glance at the CTA → tiny hop → point toward it. Safe to repeat. |
| pop_in | 1.05 s | scale from 0 at the feet, stretch up, land squash, eyes open on landing, quick wave |
| pop_out | 0.54 s | fast crouch → stretch jump → shrink away + poof. Faster than the entrance. |

One-shot states return to `idle` (or `next`). Playing any state while hidden runs `pop_in` first, then that state.

### Reduced motion

`prefers-reduced-motion` is detected automatically and can be toggled in the lab. When on:

- jumps scale to about 5%
- squash scales to about 12%
- springs are critically damped (no rebound)
- no shakes, kicks, confetti, dust or motion lines
- marks fade instead of popping
- pop in/out become opacity fades

---

## 3. Adding an animation

Add an entry to `STATES` in `mascot.js`:

```js
STATES.shrug_small = {
  label: 'Small shrug', dur: 900, spring: 'bouncy',   // dur → one-shot (returns to idle)
  steps: [
    { at: 0, face: 'confused', fx: { name: 'question', hold: 700 } },
    { at: 0, spring: 'snappy', pose: { shoulder_L: { y: -8 }, shoulder_R: { y: -8 }, head: { r: -8 } } },
    { at: 300, pose: P({ shoulder_L: { y: 0 }, shoulder_R: { y: 0 } }, arm('L', 28, 58, 22)) },
    { at: 650, pose: P({ head: { r: 0 } }, restArm('L')) },
  ],
};
```

- Use `loop: { from, to }` instead of `dur` for a looping state. Steps inside the window repeat.
- `proc(t, A)` adds procedural offsets each frame, e.g. `A('spine.sy', 0.01 * Math.sin(t / 400))`.
- Step keys: `pose`, `spring`, `hands: { L: 'open' }`, `order: { R: 'front' }`, `kick: { 'head.y': 150 }`, `shake: { amp, ms }`, `fx`, `look: [x, y] | null`, `abs: true` (skip intensity scaling).
- Optionally add a button: `<button class="btn" data-state="shrug_small">…</button>`.

New expressions go in `EXPRESSIONS` (eyes, mouth, lid, brow, cheeks, tint, dim, look).

### Public API

```js
mascot.play('wave');                // body state
mascot.setExpression('happy');      // face only ('blink' triggers a blink)
mascot.lookAt(0.8, -0.2);           // normalized −1…1; mascot.clearLook()
mascot.lookAtClient(x, y);          // page coordinates (used by pointer follow)
mascot.setSpeed(0.5); mascot.setIntensity(1.3); mascot.setReducedMotion(true);
mascot.showRig(true); mascot.reset();
mascot.on('state', e => …); mascot.on('expression', e => …);
```

---

## 4. Moving it to Rive (or Spine / AE + Lottie)

| Prototype | Rive equivalent |
|---|---|
| `BONES` hierarchy + pivots | bone hierarchy (same names and pivots) |
| `mascot_root`, `spine`, `head` scale channels | bone scale keys. Use a **mesh** on head shell, torso and hat crown for softer squash. |
| `hat_crown`, `antenna_1/2`, shoulder caps (follower dynamics) | Rive **jiggle/spring constraints**, or keyed follow-through |
| two-bone leg IK + `ikL/ikR` targets | Rive IK constraint with foot target bones |
| eye/mouth shape swaps + lid clip-paths | solo groups or blend states on a **Face** layer; lids as clipping shapes |
| `STATES` timelines | timeline animations; `loop` windows become loop regions |
| BODY / FACE / LOOK / BLINK layers | separate **state-machine layers** (body, face, look blend, blink loop, FX) |
| `play()` / `setExpression()` / `lookAt()` | state-machine inputs: triggers (`onCorrect`, `onScam`…), booleans (`isThinking`, `isListening`), numbers (`lookX`, `lookY`) |
| draw-order swaps (`order`) | Rive draw-order keys |
| `SPRING` profiles + intensity | interpolation curves per key, with a global intensity number input blending exaggerated and subtle versions |

---

## 5. Compromises versus the reference artwork

- **Rendering.** The glossy 3D look is simplified to soft 2.5D: one radial gradient per material, a few highlight strokes, and flat cel-shadow shapes. The silhouette, palette and key features are kept (police beret with badge, SAPOL pads, shield-lock chest mark, screen face, ear pods, purple antenna).
- **Front view only.** Turns are faked: the face slides across the screen, the head rotates slightly and the ear pods parallax. There is no ¾ redraw.
- **Proportions.** The head is very large relative to the arms (as in the references). The arms can't reach the hat brim, so the **salute** from reference 1 became a **thumbs-up** for Success, and the alert uses a sideways traffic-cop "stop" hand.
- **Legs.** In front view the knees bow outward when the IK crouches. This reads as a cartoon squat, not a realistic knee bend.
- **Gloves.** Five swappable hand shapes instead of articulated fingers. Swaps are hidden by a small scale pop.
- **Glow.** One SVG blur filter on the face group plus a few pre-blurred glow shapes, kept small for performance.
- **SAPOL text** uses the Nunito web font, falling back to Arial Rounded or Arial. For production, convert it to outlined paths.

## 6. What was tested

These checks were scripted in the browser:

- every state returns to idle (or loops / hides) at the right time
- rapid random clicking (400 mixed `play` / `setExpression` / `lookAt` calls): no exceptions, no NaN channels, FX count stays bounded
- after the spam, the rig settles back exactly to rest: hands relaxed, arms behind the head, FX cleaned up
- the hidden → state → pop-in chain
- reduced-motion limits
- pointer look chain timing: eyes ≈140 ms → head ≈330 ms → hat lag → antenna whip ≈550 ms → settle
- mobile layout at 375 px (no horizontal scroll)
