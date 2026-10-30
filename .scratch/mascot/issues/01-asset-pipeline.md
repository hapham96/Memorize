# 01 — Mascot asset pipeline

Status: wontfix

See `../PRD.md` → "Asset pipeline".

## What was built
- `npm run mascot -- <cmd>` → `scripts/mascot/generate.mjs` (reads `MAGNIFIC_API_KEY` via `node --env-file=.env`):
  - `poses [state...] [--n=3]`: Flux Kontext Pro seeded from the deployed `memori-waving.png` (the endpoint only takes a URL) → `scripts/mascot/out/<state>/candidate-N.{raw,}.png` (gitignored).
  - `animate <state> <n> [--regenerate]`: Kling 2.5 (720p, 5s) → first 2.4s at 10fps → matte → solidify → crop to the union silhouette → 256px ping-pong animated WebP → `public/mascot/memori-<state>.{webp,png}`. The video is cached, so re-packing is free.
  - `views`: front / side / back / three-quarter T-pose images for the 3D generator.
- Background removal is local ML (`@imgly/background-removal-node`) in its own process (`scripts/mascot/remove-bg.mjs`) — Magnific's remove-background only takes URLs, and chroma-keying failed on Memori's pastel blue. Generation uses a plain white background.
- `scripts/mascot/3d-wizard.sh`: Magnific web 3D generator → Blender (GLB→FBX) → Mixamo auto-rig → character + 6 clips into `scripts/mascot/out/rig/`.
- App icons were already switched to Memori upstream (commit 4029740), so no icon step.

## Verified
- `idle` end to end: 46-frame loop, 292KB, opaque body on every frame, no jitter.

## Remaining (human)
- Run `poses` for the other 9 states, pick a candidate each, run `animate`.
- Run the 3D wizard.

## Comments
- Known nit: a small enclosed gap (e.g. between the cap and its tassel) gets filled opaque by `solidify`.
- 2026-10-30 — switched to forward-only full 5s clips at 12fps (ping-pong looked robotic); ambient states (idle/think/sleep/worried/fight) crossfade their seam, action states play once in the app. Kling 2.1 Pro `image_tail` (native loop) FAILED with no reason — not pursued.
- Deferred asset tuning (user: "still a bit choppy on web", do last):
  - Repack is slow (~61 frames × ML matte at 512px per state). Cache matted frames so size/fps tweaks re-pack instantly; matte at 384px; run states in parallel.
  - Sizes run ~320–345KB at q50 — over the 300KB target. Try 10fps or 224px once frames are cached.
  - Choppiness: 12fps is the ceiling of what Kling frames give us cheaply; compare 15fps on one state. The 3D hero (issue 03) is the real fix on the main screens.
  - Known nit: enclosed gaps (happy/wave hand) filled white by `solidify`.
  - `fight`: legs leave the frame mid-clip (Kling zooms in) — pick another candidate or re-run with a stronger "camera static, full body" prompt.
- 2026-10-30 — Replaced by an SVG Memori (`MemoriSvg`). User: the video clips are heavy (~3.2 MB of WebP) and not cute; SVG is lighter, easier to change and cuter. The Magnific pipeline, its scripts, devDeps and every image in `public/mascot/` were removed (still in git history at 979e967). `scripts/mascot/out/` (gitignored Magnific outputs) is left on disk.
