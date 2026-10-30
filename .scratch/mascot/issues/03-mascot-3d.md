# 03 — Mascot3D on hero screens

Status: wontfix

Depends on: 01 (`memori.glb` with clips), 02. See `../PRD.md` → "Where 3D vs 2D".

## What to build
- `Mascot3D` (`@react-three/fiber` + `@react-three/drei`) playing the rigged clips by state with crossfades.
- Loaded via `next/dynamic` with `ssr: false`, only on Onboarding, Home hero, QuizResult (Auth in 04).
- Shows the 2D `Mascot` while loading, on WebGL failure, on weak devices, when the toggle is off or `prefers-reduced-motion` is set.

## Acceptance
- Landing page bundle does not include three.js.
- Clip transitions are smooth; fallback appears instantly with no layout shift.

## Comments
- 2026-10-30 — Mixamo's auto-rigger failed repeatedly ("Unknown error while generating motion") on Memori's chibi proportions, even after rescaling to 1.6 m and welding the mesh. Replaced Mixamo with `scripts/mascot/build-3d.py` (headless Blender): cleans the Tripo GLB, builds a 14-bone skeleton (head, ears, arms, legs), auto-weights with smoothed shoulders, authors 8 clips (idle, wave, happy, sad, cheer, encourage, think, worried) and exports `public/mascot/memori.glb` (~1.1 MB, 25K faces, 1024 texture). Wizard stages 3–7 are obsolete.
- Built: `Mascot3D` (2D Mascot underneath for layout/bubble/fallback, scene lazy-loaded with `ssr: false`), `Mascot3DScene` (mixer with crossfades, one-shots settle to idle or the mood's loop, tap = happy, head follows the pointer on hover devices). Swapped in on Onboarding, Home, QuizResult.
- Verified in the browser on Onboarding: wave → think → cheer transitions, pointer follow, no console errors.
- Open for human: lighting is a bit flat; Home at 80px is small for 3D; sleep/fight stay 2D.
- 2026-10-30 — Dropped. User: the 3D Memori looks off and not cute (Tripo's face: straight trunk hides the smile, small eyes; occasional spin from rotation interpolation), and the Magnific subscription has expired so the model can't be regenerated. All hero spots stay on the 2D animated WebP. Mascot3D/Mascot3DScene, three.js deps and memori.glb were removed; `scripts/mascot/build-3d.py` is kept untracked in case a better model turns up.
