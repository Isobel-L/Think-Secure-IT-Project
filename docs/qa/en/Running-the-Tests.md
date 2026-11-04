# Running the ThinkSecure QA suite

Run these commands from the **ThinkSecure repository root** in PowerShell. The checkout must contain `package-lock.json` and `tests/qa/`. Use Node.js 20 or later. Test dependencies are for development only.

## Full regression run

With Microsoft Edge installed:

```powershell
npm ci
$env:QA_BROWSER_CHANNEL = 'msedge'
npm test
```

To use Playwright Chromium instead, run `npm ci` first, then:

```powershell
npx playwright install chromium
Remove-Item Env:QA_BROWSER_CHANNEL -ErrorAction SilentlyContinue
npm test
```

The runner starts its own local HTTP server, opens a fresh browser context per browser case and shuts the server down afterward. A failed assertion gives a non-zero exit code. If the browser fails to start, record an environment failure and rerun. A report with zero cases cannot count as a pass.

Each run writes `results.json` and `summary.md` under `test-results/<timestamp>/`. The accessibility scan also writes `accessibility.json`. Save the reports with the commit, environment and tester’s name. Git ignores the results directory.

To investigate just the quiz, set `$env:QA_FILTER = 'QUIZ-'` before running `npm test`. Remove the filter with `Remove-Item Env:QA_FILTER` before the full release run.

## What the suite covers

The tests cover six languages, five strength levels, cross-page phrase transfer, PNG download, Security Bot Guidance and two five-question quiz runs. The quiz uses a fixed random seed and reads the expected answers to exercise all-correct and all-incorrect paths. Other question sets and demographic groups need separate coverage.

Password tests use synthetic examples and the real zxcvbn library. They check that the interface reflects its output. HIBP responses are simulated to exercise matches, rate limiting, service errors, timeouts and malformed data. Fonts are substituted and other external requests are blocked. The proposed input limit of 1,024 characters and 12-second lookup budget require team agreement.

The axe scan covers selected WCAG A/AA rules on the initial screens. Screen readers, later interaction states, direct file opening, deployed HTTPS settings and real CDN behaviour have separate entries in the checklist.

## Local load check

Leave `QA_LOAD_URL` unset for a local run:

```powershell
$env:QA_USERS = '50'
$env:QA_SECONDS = '10'
npm run test:load:local
```

The result is written to `test-results/load-latest.json`. Each worker repeatedly requests four static routes with a 250 ms pause. Browser rendering, full journeys and third-party calls are outside this measurement.

For an authorised staging run, set `QA_LOAD_URL` to the approved target and explicitly enable `QA_ALLOW_REMOTE_LOAD=1`. Keep HIBP and other third-party services outside load tests.

[Release checklist](Test-Checklist.md) · [Baseline test report](Test-Report.md)
