# Security Bot Guidance

## Current integration

Four pages mount the same assistant: Password Checker (`passwordChecker`), Passphrase Maker (`passphraseMaker`), Sticker Studio (`stickerStudio`), and Cyber Safety Quiz (`cyberQuiz`). Each has page-specific tips in six languages. Passphrase Maker additionally has three contextual tip groups. The pages load:

1. `css/security-helper.css` — floating launcher, robot, invitation and guidance panel.
2. Existing locale files and `js/i18n.js` — unchanged.
3. `js/security-helper-guidance.js` — six-language, page-specific tips.
4. `js/security-helper-stages.js` — invitation copy and contextual Passphrase Maker tips.
5. `js/security-helper.js` with `data-guidance="passwordChecker"` — shared interaction and rendering.

The component creates its HTML dynamically. It does not read passwords, modify activity state, or persist user input. The existing `languagechange` event refreshes its copy without resetting the current tip or closing the panel.

## Interaction

1. Initially only the Need a hand? launcher is visible. Hover does nothing.
2. Clicking the launcher replaces it with a randomly selected full-body robot. A small invitation bubble appears; detailed guidance stays closed.
3. Clicking the invitation opens one tip beside the robot (above it on narrow screens). The robot remains visible; the original launcher is hidden.
4. Closing the tip returns to the robot and invitation. Clicking the robot also returns to its invitation. The robot’s separate dismiss button returns to the compact launcher.

Keyboard Enter/Space and touch follow the same two-click sequence. Escape goes back one stage. Language changes preserve the current stage, pose, and tip. Each new summon chooses a random pose without immediately repeating the previous one. There is no timer or hover-based change, and no dragging.

The bubble has a visual tail pointing to the robot. Its content scrolls when viewport space is limited. Reduced-motion preferences disable appearance animation. If full-body artwork fails, the avatar remains a usable fallback character.

Artwork: robotimage/assistant-wave.png, robotimage/assistant-guide.png and robotimage/assistant-think.png. Generation prompts are in security-bot-artwork.md.

## Adding another page later

Create a new named entry in `window.ThinkSecureGuidance` with page-specific translations. Each locale uses the existing fields: `help`, `name`, `subtitle`, `close`, `section`, `next`, `count`, `dismiss`, `invites`, and `[title, body]` entries in `tips`. `count` contains `{n}` and `{total}`.

Load that data before mounting the component:

```html
<link rel="stylesheet" href="../css/security-helper.css">
<!-- Existing locale and i18n scripts load first. -->
<script src="../js/security-helper-guidance.js"></script>
<script src="../js/security-helper-stages.js"></script>
<script src="../js/security-helper.js" data-guidance="passwordChecker"></script>
```

For a new page, replace `passwordChecker` with its new profile name after adding the profile. Do not reuse Password Checker instructions on unrelated activities. Missing profiles mount nothing; loading the component twice does not create duplicate assistants.

Optional `data-avatar` and `data-figure` attributes select alternative artwork. Relative paths resolve against `security-helper.js`. The component positions itself above an existing `.next-step` link when present.

All four activity pages are connected. Welcome and menu pages are unchanged. Quiz supplies `data-blocker="#simulation-modal"` so the assistant temporarily hides while the simulation modal is open, then returns without changing tip state. The existing Quiz language adapter and all locale files are unchanged.

## Validation checklist

- Hover the launcher: no reveal. First click: robot and invitation. Click invitation: one detailed tip, no compact button.
- Close the bubble, reopen it, then dismiss the robot. Summon again and verify a different pose.
- Switch all six languages while speaking; retain pose and tip state.
- Use keyboard Enter/Space and Escape, and repeat the sequence with touch.
- Check bubble bounds at phone, landscape and tablet sizes.
- Verify existing activity state remains intact and Quiz modals temporarily hide the assistant.

Edge/Playwright checks passed for the four-page click flow, all six languages, keyboard, touch, nonrepeating poses, three viewport sizes and actual zxcvbn password-score preservation. Breach API responses were mocked. Earlier integration checks covered all localized tips and passphrase/sticker/Quiz state retention.

## Contextual tips

Passphrase Maker observes the existing intro, picker and result sections. They provide 3, 5 and 4 short tips respectively. Stage changes update a visible invitation and collapse an open tip, without summoning a dismissed assistant or stealing activity focus. Result tips can delegate to the existing strength-check and sticker links, preserving their handoff and language behavior.

Each stage uses a shuffled bag: every tip is selected once before the bag refills, with no immediate repeat across cycles. Language changes retain the selected tip. Invitation wording and robot artwork vary independently. Other pages retain their own four tips, now randomly rotated with the same invitation flow.

Additional Edge/Playwright checks passed for stage transitions, nonrepeating cycles, six-language state preservation, dismissed-state preservation and actual result-to-checker/sticker handoffs. Breach API responses were mocked.
