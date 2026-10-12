# Password Checker visual and animation integration

The checker uses a navy, blue and violet theme, a code-drawn shield with orbiting satellites, a scan line, and two independent animated mascots. This is the approved expressive prototype, integrated into the real activity page with relative links and the existing language system.

## Scoring and guidance

The score model moves through neutral, checking, deeply slumped with gloom effects (0), mildly dejected (1), two-handed shrug (2), double thumbs-up (3), and a single victory leap with a bent leg and raised fist (4). The leap lands and holds. The lowest score uses a low crouch, not hands-on-floor kneeling. Clear/input cancels pending choreography; translated score text remains immediate. Language changes and breach responses do not restart it.

Guidance keeps the two-click invitation/tip flow and six-language content, with a waving, blinking, pointer-following model. Closing detailed tips dismisses the entire assistant. Other activity pages retain their existing artwork and use the same corrected close behavior.

Both rigs resolve joints locally; the scoring SVG also namespaces every ID and paint/clip reference. Offscreen/background rendering pauses. Reduced motion skips the scan, orbit motion and victory jump. PNG artwork is retained as a fallback. The original scoring and passphrase handoff code are unchanged; the handoff script runs after animation listeners are installed.

## Files and provenance

- Theme: css/password-checker-theme.css (loaded only by this page).
- Motion: js/password-checker-motion.js and js/password-checker-animation.js.
- Shared model: js/security-bot-art.js and js/security-bot-runtime.js.
- Guidance adapter: js/security-bot-guidance-animation.js.
- Six dictionaries store the approved headline directly; no preview locale override is shipped.
- The mascot artwork/runtime and brand SVG originate from Tommy's team branch tommy-illustration, commit c3d23c768df0a08c3544c62f3c5a4cf53fe97ca0, thinksecure-mascot-lab and thinksecure-prototype. Runtime additions cover scoped joint lookup and pause/resume/destroy. Checker choreography, layout and shield animation are custom integration code.

## Validation

Test real zxcvbn scores across all five levels, clear/input during scanning and midair, the one-time landing and artwork bounds, guidance open/next/close/Escape, six languages, responsive widths, reduced motion, passphrase handoff, and relative links. Browser automation stubs breach responses; it does not certify live breach-service availability. The existing zxcvbn CDN dependency remains in place.
