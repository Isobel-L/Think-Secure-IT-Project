# Homepage pixel swap prototype

The user supplied the ThinkSecure logo and two identical copies of the React Bits PixelSwap JavaScript/CSS reference. `js/home-pixel-swap.js` adapts its tiled incoming-content reveal to this static HTML project; React and a build step are not required. The supplied logo is copied unchanged to `Images/thinksecure-logo.png`.

`index.html` loads the homepage-only CSS and script. Without JavaScript, the original welcome page remains available. The enhancement separates decorative faces from the single shared Start the Game link, language selector and menu link, so these controls remain usable during animation.

- Initial face: purple logo. Hover the central artwork: original welcome content. Leave the artwork: logo.
- The artwork supports touch and keyboard (Enter/Space). The extra visible toggle and instruction text have been removed.
- Random clipped square tiles reveal the incoming face over 1.4 seconds. The grid is capped at 220 tiles; decorative clones are inert and removed after completion.
- Rapid reversals queue the latest desired face. Resize or language changes settle the animation and remove snapshots. Reduced-motion preference switches immediately.
- Existing locale scripts and i18n remain unchanged. The artwork’s accessible label covers all six existing languages.

Validation: Edge/Playwright checks cover both directions, six languages, keyboard, touch, rapid reversals, resize cleanup, reduced motion, mobile/tablet widths, Start the Game during animation, menu navigation and the no-JavaScript fallback. Screenshots of both faces and the transition were visually reviewed.
