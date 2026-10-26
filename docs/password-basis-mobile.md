# Password explanations and mobile actions

- Remove only the password input placeholder; retain its visible, associated label and the educational safety note. Intentional passphrase handoff remains supported.
- The five labels are Very Weak, Weak, Medium, Strong and Very Strong. The grade remains the `score` returned by the existing zxcvbn 4.4.2 dependency; no new composition-based scoring is introduced.
- The result shows estimated guesses, a grade-specific explanation and any existing zxcvbn warning. Expand the references section for all five ranges. The expanded state survives language changes and asynchronous breach updates.
- Ranges match the pinned library's `guesses_to_score`, including `DELTA = 5`: boundaries at 1,005; 1,000,005; 100,000,005; 10,000,000,005. Displayed estimates are rounded; scoring is not. Breach checks remain independent.
- References: [Wheeler, USENIX Security 2016](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/wheeler), [zxcvbn 4.4.2 implementation](https://github.com/dropbox/zxcvbn/blob/v4.4.2/src/time_estimates.coffee), and [NIST SP 800-63B-4 §3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver). NIST supports the password advice, not these score bands.

At widths of 640px or less, the four activities use a 56px circular bot launcher above a separate 56px next-activity arrow. The route is Quiz → Password Checker → Passphrase Maker → Keychain Studio → Home. The mobile arrow also allows moving on before completing an activity; Keychain Studio retains its existing no-passphrase screen when no phrase is available. Desktop navigation and completion controls remain unchanged.

Localized accessible button names, language-preserving links, safe-area offsets, focus indicators, scrollable guidance and a single-row mobile navigation are retained. Long headings wrap on narrow screens. The mobile arrow hides while the Quiz simulation or Keychain timer dialog blocks the activity.

## Verification (26 October 2026)

Automated Edge browser checks covered all four activity pages at 320, 390, 640 and 1280 CSS pixels in English, Simplified Chinese, Traditional Chinese, Vietnamese, French and German. Checked overflow, circular launchers, separated controls, bot open/close, next-page destinations, five real zxcvbn score samples, current-grade highlighting, translation, clear/reset, animated Escape with focus restoration, 568×320 short landscape panels, and incoming passphrase auto-check. No JavaScript runtime errors occurred. Mobile screenshots were visually reviewed.

The browser test used the local zxcvbn 4.4.2 bundle and mocked font and HIBP requests for deterministic rendering. This verifies UI and estimator integration, not live HIBP availability or physical-phone behavior. No production deployment or QR code is included.
