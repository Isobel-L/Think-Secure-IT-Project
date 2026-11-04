# ThinkSecure public release test report

**Decision as of 1 November 2026.** The main activities worked in the tested environment. Public release sign-off is still pending. Of 33 automated cases, 26 passed and 7 failed. The seven failures fall into five groups because the storage issue affects three flows.

## Findings to fix and retest

| Finding | Reproduction and observed result | Recommended action |
|---|---|---|
| Unexpected breach-service response | Return HTTP 200 with an HTML error page. Password Checker finishes as though no matching breach record was found. | Validate the response format before interpreting it. Show “check unavailable” when the result cannot be read. |
| Breach lookup can wait indefinitely | Leave the request pending. The checker did not show an error within the proposed 12-second limit. | Set a timeout, retain the local strength score and offer a retry. |
| Storage restrictions break three flows | Make browser storage reads and writes throw `SecurityError`. Passphrase Maker, the handoff to Password Checker and Keychain Studio each raised an uncaught error. | Handle storage failures at each access point and tell the user how to continue. |
| Password input has no length limit | The input reports `maxLength = -1` and scoring runs synchronously. A very long paste could block interaction. A browser freeze was not measured. | Agree on an input or computation budget and enforce it before scoring. The test proposes 1,024 characters. |
| Quiz start button has insufficient contrast | On the English start screen, axe measured 3.83:1 for white text on the red button (`#fc2a12`). The rule requires 4.5:1 at its measured size and weight. | Adjust the button colours and retest its interactive states. |

## What passed

All six entry pages loaded in Edge and switched between six languages. Dictionary keys and placeholders matched. Password Checker displayed all five strength levels consistently with the scoring library. Show, hide and clear worked. A late response did not restore a cleared result. Simulated breach matches and HTTP 429 and 503 errors produced the expected results.

The four-word flow carried a phrase into Password Checker, retained Simplified Chinese and produced a downloadable PNG in Keychain Studio. Keyboard opening and closing, focus return and reduced-motion checks passed for Security Bot Guidance on all four activity pages. Two fixed-seed quiz runs produced 5/5 and 0/5, then restarted successfully. The German entry screens showed no page-level horizontal overflow at 320, 390, 768 and 1,440 pixels.

## Environment and evidence

- Application commit `255a997c50deaff66c51a53fb27c6978c12edcad`. The local feature branch had been fast-forwarded to the tested main revision.
- Windows, headless Microsoft Edge 156.0.4314.50, Node.js 24.19.0, Playwright 1.62.1, axe-core 4.14.0 and zxcvbn 4.4.2.
- Pages ran over local HTTP. The scoring library was real. Have I Been Pwned (HIBP) responses were simulated, font requests were substituted and other external requests were blocked.
- The final full run is recorded under `test-results/2026-11-01T08-23-49-124Z/` in the original checkout. The folder contains `results.json`, `summary.md`, `accessibility.json` and the downloaded `keychain.png`. An earlier browser startup failure and quiz test-script debugging runs are excluded from the totals.
- A separate 10-second local load check used 50 workers across four static routes, with a 250 ms pause between requests per worker. It completed 1,750 requests with zero errors. The 95th percentile was 41.4 ms and the 99th was 44.3 ms. Capacity for hundreds of simultaneous public users still requires a staging test with realistic journeys.

**Next step.** Fix the five findings and rerun the full suite. Use the [release checklist](Test-Checklist.md) to assign device, accessibility, translation, security and staging checks before sign-off.
