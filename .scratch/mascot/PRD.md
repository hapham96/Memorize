# PRD: Memori mascot — animated states, 3D, interactive login

Status: ready-for-agent

## Problem

Memori (the blue baby elephant in a graduation cap) exists as 4 static PNGs in `public/mascot/`, rendered by `src/components/mascot/Mascot.tsx` with a framer-motion bob. It appears on 8 screens but never *reacts* to anything the user does — quiz answers, streaks, empty states and login all look the same. The app icon (`src/app/icon.png`) is still an older bunny/blob character.

## Solution

Keep Memori (an elephant "never forgets" — fits a memory app). Give it a full set of reactive states, real 3D on a few hero screens, and an interactive login. Frontend-only; the backend doesn't change.

## Decisions

### Character & states
- 10 states: `idle, wave, happy, sad, cheer, encourage, worried, sleep, think, fight`, plus `icon`.
- Old moods are renamed: `waving → wave`, `celebrating → cheer`, `studying → think`.
- App icons (`src/app/icon.png`, `apple-icon.png`, `favicon.ico`, `public/icon-*.png`) switch to Memori.

| State | Used at | 3D source |
|---|---|---|
| `idle` | Home, Auth with nothing focused | Mixamo clip |
| `wave` | Onboarding, Home greeting | Mixamo clip |
| `happy` | Correct quiz answer | Mixamo clip |
| `sad` | Wrong quiz answer, failed login | Mixamo clip |
| `cheer` | High quiz result, successful login, Battle win | Mixamo clip |
| `encourage` | Low quiz result, Battle loss | Mixamo clip |
| `worried` | Streak at risk | animated WebP only |
| `sleep` | Empty states (no words, nothing due) | animated WebP only |
| `think` | Loading, studying | animated WebP only |
| `fight` | Entering a Battle | animated WebP only |

### Asset pipeline (one-off, offline)
- A local script calls the Magnific API with `MAGNIFIC_API_KEY` from `.env` (never `NEXT_PUBLIC_`). Outputs are committed under `public/mascot/`. The app never calls Magnific at runtime.
- New poses are generated with a reference-image edit model (Flux Kontext Pro / Seedream edit) seeded from `memori-waving.png`, so identity (face, colour, cap) stays consistent. Several candidates per state; a human picks one.
- Animated states: Kling image-to-video on a plain background → frames → background removal → **animated WebP** (iOS Safari can't play alpha WebM). Replaces the existing GIFs. Target ~100–300KB per state.
- 3D: the script generates 4 views (front/side/back/T-pose). A human then runs Magnific's web 3D Model Generator (no API exists) to get a `.glb`, auto-rigs it on Mixamo, and downloads clips `idle, wave, happy, sad, cheer, encourage`. A wizard walks through these manual steps.

### Where 3D vs 2D
- **Real 3D** (three.js via `@react-three/fiber`): Auth, Onboarding, Home hero, QuizResult.
- **Animated WebP**: Header, Profile, in-quiz reactions, empty states, Battle, loading, streak.
- three.js is lazy-loaded (dynamic import, `ssr: false`) only on screens that use it — landing/SEO is unaffected.
- Fallback to the PNG/WebP while loading, when WebGL fails, or on weak devices.
- `prefers-reduced-motion`, or the new **"Hoạt ảnh mascot"** toggle in `SettingsModal` turned off → static image everywhere and no 3D is loaded (Auth included).

### Behaviour
- In-quiz reactions last ~1s in a corner, never block the next question or cover answers.
- Speech bubbles in Vietnamese, 3–5 hand-written lines per moment, picked at random. No runtime AI copy.
- No sound in v1.

### Interactive login (Auth)
- Typing in email/name: the head turns to follow the text caret (longer text → head turns further right). Moving between fields eases smoothly.
- Nothing focused: follow the pointer on desktop; on mobile look forward and breathe.
- Password (or confirm-password) focused and hidden: both hands cover the eyes.
- That field's show-password toggle on: one hand drops — peeking.
- Leaving the field: hands go down, even if a password was typed.
- Failed login → `sad` head shake. Success → one `cheer` beat, then transition.
- Head look and hand poses are procedural (bones driven in code); no eyeball movement — the eyes are baked into the texture.

## Out of scope
- Sound effects.
- Separate eyeball meshes / eyelids.
- Any backend change.

## Slices
1. `issues/01-asset-pipeline.md` — Magnific generation script + manual 3D/rig wizard
2. `issues/02-mascot-states-and-moments.md` — 10-state `Mascot`, bubbles, settings toggle, wire into the 8 moments
3. `issues/03-mascot-3d.md` — `Mascot3D` with lazy loading and fallback on hero screens
4. `issues/04-interactive-login.md` — look-follow / cover-eyes / peek on Auth
