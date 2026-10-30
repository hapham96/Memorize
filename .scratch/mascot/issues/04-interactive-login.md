# 04 — Interactive login mascot

Status: ready-for-human

Depends on: 03. See `../PRD.md` → "Interactive login (Auth)".

## What to build
In `AuthScreen.tsx`, drive `Mascot3D` bones procedurally:
- Email/name focused: head yaw follows caret position; smooth easing between fields.
- Nothing focused: follow pointer (desktop) / look forward + breathe (mobile).
- Password or confirm focused + hidden: both hands cover eyes. Its own show toggle on: one hand drops (peek). Blur: hands down.
- Login error → `sad` shake; success → one `cheer` beat before transition.

## Acceptance
- All states above behave correctly for both login and register modes.
- With the toggle off / reduced motion, Auth shows the static mascot and loads no 3D.

## Comments
- 2026-10-30 — 3D dropped (see 03), and a paw cut out of the clay still looked like spots on the eyes. Rebuilt as `AuthMascot`: a flat SVG Memori in a round avatar, made of parts (eyes, trunk, mouth, arms) in the style of the "yeti" login form the user pointed to. Eyes and trunk follow the caret in name/email (no pointer follow, per user); arms rise to cover the eyes on a hidden password; the right paw drops to the cheek when it's shown; blink loop; sad = brows/ears/frown + shake; success = arms up + hop, 0.9s before `onLoginSuccess`. The show/hide toggle keeps focus in its field. Checked all six poses on a temporary preview page; the live form needs a signed-out check by the user.
