# 02 — Mascot states, bubbles, settings toggle, moments

Status: ready-for-human

Depends on: 01 (assets). See `../PRD.md` → "Character & states", "Behaviour".

## What was built
- `Mascot.tsx`: 11 moods (`idle | wave | happy | sad | cheer | encourage | worried | sleep | think | fight | icon`), `useGif` removed. Each mood tries `memori-<mood>.webp` (when animating) → `memori-<mood>.png` → the closest original still, falling through on 404 — so moods not generated yet still render, and upgrade automatically once `npm run mascot -- animate` writes their files. The framer-motion bob only runs on stills.
- `mascotLines.ts`: Vietnamese line pools per moment; `useMascotLine` keeps a line stable across re-renders.
- `lib/mascot-motion.ts`: module singleton (like `soundFX`) fed by `applySettingsEffects` + `prefers-reduced-motion`; `useMascotMotion()` reads it.
- Settings: "Hoạt ảnh mascot" toggle → `AppSettings.mascotAnimations` (device-only, not sent to `/settings`).
- `MascotReaction`: ~1.2s happy/sad pop-in at top-right of the app shell, `pointer-events-none`; skipped when motion is off.

## Moments wired
- Auth: greeting line; `sad` while an error is shown.
- Onboarding / Header / Profile: renamed moods.
- Home: `worried` (streak at risk) > `cheer` (goal done) > `think` + due count > `wave` + time-of-day greeting.
- All 5 quizzes: correct/wrong reaction (flashcard: rating ≥ 3 = recalled).
- QuizResult: `cheer` ≥ 80%, else `encourage`.
- Review: hero `think`/`sleep` by state; queue loading `think`, empty library / all caught up `sleep`.
- Word library empty: `sleep`. Quiz selection: loading `think`, "nothing to practise" `sleep`.
- Battle: `fight` on the Battle home card; result card `cheer` (1st) / `encourage`.

## Verified
- `tsc --noEmit` clean; `next build` compiles and type-checks. (`/opengraph-image` prerender fails on Windows in `@vercel/og` — pre-existing, unrelated.)
- Not yet clicked through in a browser.

## Comments
- "Streak rising" has no dedicated moment — Home's goal/greeting covers the active-today case.
- Home's mascot is still `hidden sm:inline-flex` (desktop only), as before; issue 03 reworks the Home hero for 3D.

- 2026-10-30 — Moods now render through `MemoriSvg`: each mood is a pose (eyes, brows, mouth, arm angle and reach, ears, glance, trunk, tilt) plus an effect (Zzz, thinking dots, sweat, tear, sparkles) and a CSS motion (bob, hop, nod, breathe, bounce, wave). `Mascot`'s props are unchanged, so no call site moved. Sizes under 44px show the head only. One-shots (wave, happy, cheer, encourage) settle to idle after 2.6s; sad holds.
