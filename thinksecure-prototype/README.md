# ThinkSecure — one illustrated world (prototype)

Standalone prototype, outside the team repo. Open `index.html` in a browser (needs internet for GSAP and Google Fonts).

## What it does
- **Intro**: "Think" then "Secure" pop in, a sun swells, hills sweep up, and the mascot flies up into the first scene.
- **Four full-screen scenes** (Quiz, Password, Passphrase, Sticker Studio). Each SVG fills the viewport through a per-scene "camera" (`roi` in `js/app.js`): wide screens show the whole scene with extra sky for the words; portrait screens zoom onto the main object and the mascot, and the words sit on the scene's ground colour below.
- **One mascot**: at load the mascot groups are moved out of each scene into their own layer (`#mascotLayer`), so exactly one is ever visible. Whatever was painted in front of it in the original (hills, the phone frame, the screen bar, foliage) becomes a mask, so the layering matches Tommy's artwork.
- **Transitions**: words leave → mascot crouches and takes off (as the free-flying pose from the Password scene) → old scene sinks back by depth → new scene opens in a circle around the mascot's landing spot → mascot lands, squashes, settles into the new pose → new words arrive. About 1.1 s. Rapid input is queued (latest wins) and the running transition speeds up.
- **Navigation**: dock with numbered, labelled stops plus prev/next; ←/→, PageUp/PageDown, 1–4, swipe, mouse wheel; `#quiz`, `#password`, `#passphrase`, `#sticker` deep links.
- **Reduced motion**: 0.2 s cross-fade, no flight, no parallax, no intro.

## Files
- `assets/scenes/*.svg` — Tommy's illustrations, the source of truth (untouched by the code; the mascot is lifted out at runtime).
- `js/scenes.js` — generated. After editing any SVG run `node tools/bundle-scenes.mjs` (strips Inkscape markup and prefixes ids per scene so the four can share one page).
- `js/app.js` — `ACTS` holds each activity's copy, colours, text position, mascot group ids and camera regions.
- Testing aids: `?skip` (no intro), `?fast` (20× speed), `?reduced` (reduced-motion preview).
- `tools/compare.html?s=quiz` — original PNG vs SVG side by side (serve the folder, e.g. `python3 -m http.server`).

If a scene's mascot group ids change in Inkscape, update the `mascot:` ids in `ACTS`.
