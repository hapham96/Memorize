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

- `isOnboarding` / `isAuth` → early returns render onboarding/auth screens
- `activeQuizMode` → early return renders the active quiz
- `activeTab` (`home | learn | review | stats | profile`) → renders the corresponding dashboard

All persistent app state (`allWords`, `userProgress`, `srsMap`, `achievements`, `settings`) is owned by `page.tsx` and threaded to children as props. There is no Context, reducer, or store — new shared state goes in `page.tsx` and gets passed down.

### Persistence: localStorage, hydration-safe

[src/lib/storage.ts](src/lib/storage.ts) is the only persistence layer (`memorize_*` keys). Every `load*` returns a default when `typeof window === 'undefined'`, and loading happens in a `useEffect` in `page.tsx` — never at render time. Preserve this pattern or SSR/hydration breaks.

`loadSRSData()` seeds a fake starting state on first run (first 5 words `mastered`, next 7 `learning`), and `DEFAULT_USER_PROGRESS` is prefilled demo data (level 12, 2840 XP, fake history). This is intentional demo seeding, not real state.

### SRS: local-first, backend-overwrites

Reviews follow an optimistic dual-source flow. In `handleRateFlashcardWord` ([src/app/page.tsx](src/app/page.tsx)) and `ReviewDashboard`:

1. `calculateNextSRS()` ([src/lib/srs.ts](src/lib/srs.ts)) computes SM-2 locally and updates state immediately
2. `submitReview()` POSTs to the backend
3. On success, the mapped backend response **overwrites** the local result
4. On failure, the error is caught and logged — the local result stands

**The backend is optional everywhere.** Every API call site wraps in try/catch and degrades to local data. Do not make backend availability a hard requirement.

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

### Known incomplete integration points

These are stubs, not bugs to "fix" incidentally — check before changing:

- **Auth**: [src/lib/api/client.ts](src/lib/api/client.ts) hardcodes `const token = "empty token"` for the `Bearer` header. `AuthScreen` only sets a display name; there is no real session.
- **User ID**: `getDueReviews(userId = 1)` and `AddWordRequest.userId` are hardcoded to `1`.
- **Word IDs**: local dataset uses string ids (`w1`, `w2`…), backend uses numeric. `resolveWordForUserWord()` in [src/components/review/ReviewDashboard.tsx](src/components/review/ReviewDashboard.tsx) reconciles both forms and synthesizes a placeholder `Word` when no local match exists.

### Third-party lookups in AddWordModal

[src/components/dashboard/AddWordModal.tsx](src/components/dashboard/AddWordModal.tsx) (~1000 lines) calls two public APIs directly from the browser, each with a local fallback:

- **Datamuse** (`api.datamuse.com/words?sp=<prefix>*`) — debounced 200ms autocomplete; falls back to `getRelatedWordSuggestions()` in [src/data/relatedWords.ts](src/data/relatedWords.ts)
- **dictionaryapi.dev** — auto-fills IPA / part-of-speech / definition / example on suggestion select; falls back to `getWordDetails()` from the same local file

It also handles bulk Excel/CSV import and template export via `xlsx`.

## Conventions

- **UI copy is Vietnamese**; vocabulary data is English with Vietnamese `vietnamese`/`translation` fields. Match the surrounding language when adding strings.
- **Dark mode** is Tailwind `darkMode: 'class'`, toggled by directly adding/removing `dark` on `document.documentElement` in `page.tsx` (`handleUpdateSettings` and the mount effect). There is no theme provider. The `'system'` theme option exists in `AppSettings` but is treated as light.
- **Styling** uses the custom `apple` color palette and `card`/`button`/`input`/`nav` border-radius tokens in [tailwind.config.ts](tailwind.config.ts) — prefer these over raw values.
- Every component under `src/components/` is `'use client'`. Animations are Framer Motion; icons are `lucide-react`.
- **Audio** is fully synthesized — [src/lib/audio.ts](src/lib/audio.ts) uses Web Speech API for pronunciation and a Web Audio oscillator engine (`soundFX`) for UI sounds. No audio assets.
- XP/leveling constants are inline in `page.tsx`: 5 XP per correct + 10 completion bonus, 20 XP per custom word, level = `floor(xp / 300) + 1`.
