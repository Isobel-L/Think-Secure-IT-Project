# ThinkSecure public release test checklist

Baseline: 1 November 2026, commit `255a997c50deaff66c51a53fb27c6978c12edcad`. Copy this checklist for each release and record the version, environment, tester, date and evidence. Use synthetic passwords throughout.

**Pass** applies to the stated scope. **Fail** requires a fix and retest. **Pending** means the check has yet to run. P1 items should be resolved before public release. P2 items are lower priority. The rows group related cases, so the row count differs from the automated case count.

## Automated and local checks completed

| ID | Action | Acceptance criterion | Baseline result and evidence |
|---|---|---|---|
| A01 · P1 | Open the home page, menu and four activities. Check local HTML links and filename case. | No missing referenced files, local 404s or uncaught errors on entry. | Pass · STATIC-01, PAGE-* |
| A02 · P1 | Switch each page through all six languages. Compare dictionary keys and placeholders. | Correct page language, no visible raw keys on the checked elements, matching placeholders. | Pass · I18N-01, PAGE-*. Translation quality needs review. |
| A03 · P1 | Submit examples scoring 0 through 4. | Meter and bot state match the scoring library. | Pass · PW-01 |
| A04 · P1 | Try empty, Unicode and HTML-like input. Toggle visibility and clear. | Input displays safely and clearing restores the initial state. | Pass · PW-02 |
| A05 · P1 | Inspect requests and storage while testing a synthetic password. | Lookup sends only the five-character SHA-1 prefix, uses padding and exposes neither the raw password nor the full hash in captured requests. No raw password appears in checked storage. | Pass · PRIV-01 |
| A06 · P1 | Simulate a matching breach suffix and count. | Result records the match and correct count. | Pass · PW-03 |
| A07 · P1 | Simulate HTTP 429, 503 and a missing scoring library. | Show an unavailable state. Retain the local score when only the lookup fails. | Pass · FAIL-429, FAIL-503, FAIL-CDN |
| A08 · P1 | Clear a result before a delayed lookup completes. | The late response cannot restore the cleared result. | Pass · RACE-01 |
| A09 · P1 | Leave the lookup pending. | Stop waiting within the agreed time budget and retain the local score. | Fail · FAIL-TIMEOUT. Proposed budget: 12 seconds. |
| A10 · P1 | Inspect the input limit before synchronous scoring. | Bound the input or computation cost. | Fail · BOUND-01. No maxlength. Proposed limit: 1,024 characters. |
| A11 · P1 | Return HTTP 200 with an HTML error body. | Report a lookup error instead of a negative match. | Fail · FAIL-MALFORMED |
| A12 · P1 | Choose four words in Chinese, open Checker and download in Keychain Studio. | Phrase and language persist. Download is a valid PNG. | Pass · FLOW-01, one choice path |
| A13 · P1 | Deny storage access in Maker, Checker handoff and Keychain. | Each flow offers a usable fallback without an uncaught error. | Fail · three STORAGE-* cases |
| A14 · P1 | Save a phrase record with an invalid words field, then open Keychain. | Show the no-phrase state safely. | Pass · STORAGE-INVALID |
| A15 · P1 | Open Guidance by keyboard on four activity pages, advance a tip, close with Escape and exercise reduced-motion mode. | Guidance opens and closes, and keyboard focus returns to the launcher. | Pass · BOT-* |
| A16 · P1 | Complete five fixed-seed questions twice, all correct and all wrong. Restart after each run. | Scores are 5/5 and 0/5. Restart returns to the beginning. | Pass · QUIZ-RIGHT, QUIZ-WRONG |
| A17 · P1 | Run selected axe WCAG A/AA rules on six English entry screens. | No violations of scanned rules. | Fail · A11Y-AXE. Quiz start button measured 3.83:1 against 4.5:1 required. |
| A18 · P1 | Inspect visible form controls and image alt attributes on entry. | Controls have programmatic labels and images have alt attributes. | Pass · A11Y-01. Wording needs human review. |
| A19 · P1 | Open six German entry screens at 320, 390, 768 and 1,440 px. | No page-level horizontal overflow. | Pass · LAYOUT-01 |
| A20 · P2 | Run 50 local workers for 10 seconds over four static routes. | No request errors. | Pass · 1,750 requests, zero errors. Public capacity pending. |

## Manual and staging checks

All items below are **pending**. Assign a tester and reviewer. Record the actual device and browser version, steps, expected and observed behaviour, and evidence for each failure.

| ID | Test procedure | Pass criterion |
|---|---|---|
| M01 · P1 | Complete all activities and a Keychain download on Chrome, Edge, Firefox, Safari, iPhone Safari and Android Chrome. | Each journey completes with usable controls, correct focus and a working download. |
| M02 · P1 | For six languages, navigate, refresh, use Back/Forward and open a direct language link. Ask fluent speakers to review dynamic text. | Language persists and questions, errors and guidance read accurately. |
| M03 · P1 | Vary quiz demographics and question types, mix right and wrong answers, and double-click submit and next. | Five questions, correct score, no double counting, usable inspection and review controls. |
| M04 · P1 | Complete every activity with Tab, Shift+Tab, Enter, Space and Escape. | Visible focus, logical order, operable dialogs and predictable focus return. |
| M05 · P1 | Use NVDA or VoiceOver for quiz questions, strength results, errors, dialogs and Guidance. | Names and announcements are understandable and do not repeatedly interrupt the task. |
| M06 · P1 | Try 200% and 400% zoom, both orientations, long translations, the bot and an on-screen keyboard. | Text stays readable and important controls stay reachable. |
| M07 · P1 | Work slowly through Keychain’s 45-second timer. Check the warning, background tab and expiry. | Time limit is clear, work is not unexpectedly lost, and the team reviews whether extension or pause is required. |
| M08 · P1 | Try alternative word combinations, symbol swaps, regeneration, missing or old phrase data and every product style. Print a sample. | Correct phrase, clear recovery route, usable download and legible physical output. |
| M09 · P1 | Toggle the bot rapidly, change pages and stages, and use touch and reduced-motion settings. | One usable prompt at a time, relevant guidance and a working launcher after closing. |
| M10 · P1 | Disconnect, throttle and reconnect. Check real HTTPS, CORS and HIBP behaviour with a small authorised staging sample. | Errors recover cleanly and the page accurately distinguishes unavailable data from a completed lookup. |
| M11 · P1 | Open deep links on the deployment preview, check case-sensitive resources, and revisit with an old cache after an update. | Links and dynamic assets load and cached files remain compatible. |
| M12 · P1 | Inspect deployed requests, logs, analytics, third-party scripts, retention and privacy notices. | No passwords are logged. Phrase handling and external requests match the stated privacy commitments. |
| M13 · P1 | Review dependencies, HTTPS, security headers, CSP, DOM injection points and asset integrity. | Findings have owners and resolutions. Record whether an independent security review is needed. |
| M14 · P1 | Measure cold and warm loads on a slow mobile network and a low-end phone. | Agree budgets for LCP, INP, CLS and download size before measuring, then record results against them. |
| M15 · P1 | On approved staging, step through 10, 50, 100 and 300 simulated sessions. Monitor errors, p95/p99, caching and throttling. | Each level meets the agreed budget before increasing load. Exclude third-party APIs. |
| M16 · P1 | Rehearse deployment, rollback, a missing asset and error alerting. | A known-good version can be restored. Alerts omit sensitive input and have a named owner. |
| M17 · P2 | If direct file opening is supported, repeat language switching, phrase handoff and download using file://. | Supported behaviour and browser limits are documented, or local HTTP instructions are supplied. |

## Release sign-off

1. Fix the seven failing cases, rerun the complete suite and save both baseline and retest evidence.
2. Complete M01–M13. Record an owner, fix version and reviewer for each issue. Keep unresolved P1 items open.
3. Agree staging capacity budgets before testing. Static response p95 below one second and an error rate below 1% are proposed starting points for discussion.
4. Start with a low-load baseline. A suggested staging schedule is two minutes to ramp up and five minutes to hold each level, followed by a sustained run. Stop and investigate if errors or resource pressure rise.
5. Rerun regression before release, confirm the rollback version and perform a small post-release smoke test with synthetic data. Record the team’s decision on residual risks.

[Baseline report](Test-Report.md) · [How to run the tests](Running-the-Tests.md)
