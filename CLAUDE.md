# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # dev server on :3000
npm run build   # production build
npm run start   # serve production build
npm run lint    # next lint (eslint-config-next)
```

No test framework is configured — there are no test files or test runner in this project.

Env: copy `.env.example` → `.env`. Only `NEXT_PUBLIC_API_URL` exists (defaults to empty string in `src/lib/api/client.ts`, so all backend calls silently fail without it — which the app tolerates, see below).

## Architecture

### Single-page, state-driven, no routing

Despite being Next.js 14 App Router, the entire app is one client component: [src/app/page.tsx](src/app/page.tsx). There is exactly one route. Navigation is `useState` in that file:

- `session` is `null` → early return renders onboarding or the auth screen (`authView`); **nothing below is reachable signed out**
- `activeQuizMode` → early return renders the active quiz
- `activeTab` (`home | learn | review | stats | profile`) → renders the corresponding dashboard

All persistent app state (`allWords`, `userProgress`, `srsMap`, `settings`) is owned by `page.tsx` and threaded to children as props. There is no Context, reducer, or store — new shared state goes in `page.tsx` and gets passed down.

### Persistence: localStorage, hydration-safe

[src/lib/storage.ts](src/lib/storage.ts) is the only persistence layer (`memorize_*` keys). Every `load*` returns a default when `typeof window === 'undefined'`, and loading happens in a `useEffect` in `page.tsx` — never at render time. Preserve this pattern or SSR/hydration breaks.

Nothing is seeded. `loadSRSData()` returns `{}` and `loadUserProgress()` returns `createEmptyUserProgress()` on first run — every number the UI shows comes from something the user did. `DEFAULT_USER_PROGRESS` is only a typed placeholder for the tick before `loadAccountState()` runs.

Per-account keys (progress, SRS, custom words, reminders) are suffixed `__u<userId>` via `setStorageScope()`; `AUTH` and `SETTINGS` are global. `loadSRSData()`/`normalizeProgress()` also prune ids matching `/^w\d+$/` — leftovers from the removed bundled dataset.

### SRS: local-first, backend-overwrites

Reviews follow an optimistic dual-source flow. In `handleRateFlashcardWord` ([src/app/page.tsx](src/app/page.tsx)) and `ReviewDashboard`:

1. `calculateNextSRS()` ([src/lib/srs.ts](src/lib/srs.ts)) computes SM-2 locally and updates state immediately
2. `submitReview()` POSTs to the backend
3. On success, the mapped backend response **overwrites** the local result
4. On failure, the error is caught and logged — the local result stands

**The backend is optional for reads/writes, not for entry.** Sign-in and registration must succeed against the API — there is no offline bypass. Once signed in, every API call site wraps in try/catch and degrades to local data, so a request that fails mid-session never blocks the UI. A 401 clears the session (`client.ts`) and `hydrateFromApi` signs the user out back to the auth screen.

Rating scale is SM-2 quality 0–5 (`ReviewQuality`); `q < 3` resets repetitions. State derives from interval/reps: `interval >= 21` → `mastered`, `repetitions > 1` → `review`.

### Two type systems, bridged by mappers

- [src/types/index.ts](src/types/index.ts) — app domain types (`Word`, `SRSData`, `UserProgress`)
- [src/types/word.ts](src/types/word.ts) — `Backend*`-prefixed wire types matching the API verbatim

[src/lib/api/word-client.ts](src/lib/api/word-client.ts) holds all `map*` functions translating between them. Field names deliberately differ and must be mapped, not passed through:

| Backend | App |
|---|---|
| `easinessFactor` | `easeFactor` |
| `dueAt` | `nextReviewDate` |
| `status` | `state` |
| `headword` | `word` |
| `ipaPronunciation` | `ipa` |

Backend responses are sparse relative to `Word`, so mappers take a `fallback?: Partial<Word>` and fill gaps with locally-entered values.

`GET /reviews/due` sends no `userId` — the account comes from the bearer token. Each row is a `BackendDueReview` (`BackendUserWord` + an optional embedded `word` carrying `definitions[].examples[]`); `mapBackendWordToWord` turns that into a full `Word`, and `resolveWordForUserWord` prefers it over the local copy, falling back to `createPlaceholderWord` only when the row has no embed and the device has never seen the word. `hydrateFromApi` adopts embedded words the local library is missing.

### Auth is mandatory

There is no demo mode, no guest mode and no bundled vocabulary. A user must log in or register before any feature is reachable, and the whole word library is what that account added.

- `AuthScreen` only ever calls `onLoginSuccess` with a real `AuthSession` from `/auth/login` or `/auth/register`.
- `getCurrentUserId()` returns `number | null` — **never invent an id**. `getDueReviews()` returns `[]` and `AddWordModal` skips the POST when it is null, because a fabricated id writes into someone else's account.
- A new account legitimately has zero words. Guard anything that assumes a non-empty library (`handleStartQuiz` opens `AddWordModal` instead of an empty session; `ReviewDashboard` shows an empty-library state).

### Known incomplete integration points

These are stubs, not bugs to "fix" incidentally — check before changing:

- **Social login**: removed, not implemented. There is no OAuth backend, so the Apple/Google buttons were deleted rather than left as fake sign-ins.
- **Display name**: the backend stores none; it is derived from the email local-part (`getDisplayName`) or what the user typed at registration, and kept only in local progress.
- **Word IDs**: locally added words get an optimistic `custom_…` id and are re-keyed to the backend's numeric id by `handleWordSynced` once `/words` answers. `resolveWordForUserWord()` synthesizes a placeholder `Word` for a backend word with no local copy.

### Third-party lookups in AddWordModal

[src/components/dashboard/AddWordModal.tsx](src/components/dashboard/AddWordModal.tsx) (~1000 lines) calls two public APIs directly from the browser, each with a local fallback:

- **Datamuse** (`api.datamuse.com/words?sp=<prefix>*`) — debounced 200ms autocomplete; falls back to `getRelatedWordSuggestions()` in [src/data/relatedWords.ts](src/data/relatedWords.ts)
- **dictionaryapi.dev** — auto-fills IPA / part-of-speech / definition / example on suggestion select; falls back to `getWordDetails()` from the same local file

It also handles bulk Excel/CSV import and template export via `xlsx`.

## Conventions

- **UI copy is Vietnamese**; vocabulary data is English with Vietnamese `vietnamese`/`translation` fields. Match the surrounding language when adding strings.
- **Code comments are English** — JSDoc, inline `//`, and JSX `{/* */}` alike. This is independent of the Vietnamese UI copy above.
- **Dark mode** is Tailwind `darkMode: 'class'`, toggled by directly adding/removing `dark` on `document.documentElement` in `page.tsx` (`handleUpdateSettings` and the mount effect). There is no theme provider. The `'system'` theme option exists in `AppSettings` but is treated as light.
- **Styling** is a **Claymorphism** theme defined entirely in [tailwind.config.ts](tailwind.config.ts) + [src/app/globals.css](src/app/globals.css). Read the header comment in the config before touching colors.
  - The stock `slate` (neutral) and `blue` (primary) ramps are **re-tinted**, not replaced — `slate` is a lavender-warm neutral, `blue` is indigo (`#4F46E5` at 600). Components keep using `slate-*`/`blue-*`; the theme changes from one place. `clay-*` holds the pastel accents.
  - Surfaces are **matte**: `border-clay` (3px) + a `shadow-clay*` double shadow. No gradients, no `backdrop-blur` — both were deliberately removed. Recessed things (inputs, progress tracks) use `shadow-clay-inset`.
  - `shadow-clay*` resolve to CSS variables so dark mode can swap the inner highlight; `slate-400` is a channel variable for the same reason (contrast). Set both in `globals.css`, never inline.
  - Ready-made classes: `.clay-card`, `.clay-btn`, `.clay-well`, `.clay-nav`, `.clay-pill`. Motion uses `ease-clay` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Fonts must carry the `vietnamese` subset.** UI copy is Vietnamese and `ọ ợ ệ` live only in that subset — a font without it falls back mid-word. Baloo 2 (display) + Nunito (body); Fredoka was rejected for exactly this reason. See [src/app/layout.tsx](src/app/layout.tsx).
- Every component under `src/components/` is `'use client'`. Animations are Framer Motion; icons are `lucide-react`.
- **Audio** is fully synthesized — [src/lib/audio.ts](src/lib/audio.ts) uses Web Speech API for pronunciation and a Web Audio oscillator engine (`soundFX`) for UI sounds. No audio assets.
- XP/leveling constants are inline in `page.tsx`: 5 XP per correct + 10 completion bonus, 20 XP per custom word, level = `floor(xp / 300) + 1`.
