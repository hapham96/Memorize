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

[src/lib/storage.ts](src/lib/storage.ts) is the only persistence layer (`memorize_*` keys). Every `load*` returns a default when `typeof window === 'undefined'`, and loading happens in a `useEffect` — in `page.tsx`, or in the owning component's mount effect for the word-library cache below — never at render time. Preserve this pattern or SSR/hydration breaks.

Nothing is seeded. `loadSRSData()` returns `{}` and `loadUserProgress()` returns `createEmptyUserProgress()` on first run — every number the UI shows comes from something the user did. `DEFAULT_USER_PROGRESS` is only a typed placeholder for the tick before `loadAccountState()` runs.

Per-account keys (progress, SRS, custom words, reminders, categories, word library) are suffixed `__u<userId>` via `setStorageScope()`; `AUTH` and `SETTINGS` are global. `loadSRSData()`/`normalizeProgress()` also prune ids matching `/^w\d+$/` — leftovers from the removed bundled dataset.

### SRS: local-first, backend-overwrites

Reviews follow an optimistic dual-source flow. In `handleRateFlashcardWord` ([src/app/page.tsx](src/app/page.tsx)) and `ReviewDashboard`:

1. `calculateNextSRS()` ([src/lib/srs.ts](src/lib/srs.ts)) computes SM-2 locally and updates state immediately
2. `submitReview()` POSTs to the backend
3. On success, the mapped backend response **overwrites** the local result
4. On failure, the error is caught and logged — the local result stands

**The backend is optional for reads/writes, not for entry.** Sign-in and registration must succeed against the API — there is no offline bypass. Once signed in, every API call site wraps in try/catch and degrades to local data, so a request that fails mid-session never blocks the UI. A 401 clears the session (`client.ts`) and `hydrateFromApi` signs the user out back to the auth screen.

Rating scale is SM-2 quality 0–5 (`ReviewQuality`); `q < 3` resets repetitions. State derives from interval/reps: `interval >= 21` → `mastered`, `repetitions > 1` → `review`.

#### `/reviews/due` is asked once, by the review tab only

`GET /reviews/due` is the only endpoint that carries `userWordId` — the id `POST /reviews/:id` is sent to — and that is the only reason to call it. So [ReviewDashboard](src/components/review/ReviewDashboard.tsx) is its **single** caller: a mount-only effect (the component exists only while the tab is open), the header refresh button, "Bắt đầu ôn tập", and the end of a queue. Its props are read through `latestRef` so a new `allWords` identity cannot turn that into another request.

Everything else that needs to know what is due reads `dueAt` off the **cached word library** instead (see below), which costs a localStorage read:

- [useDueReminders](src/hooks/useDueReminders.ts) calls `getUserWordLibrary()` on its tick (5-min poll, foreground events, the exact due timer, `refreshDue()`), never `/reviews/due`.
- `hydrateFromApi` in `page.tsx` does the same on account load, and folds each row's `dueAt`/`status` into `srsMap` — **preserving** `userWordId`/`interval`/`repetitions`/`easeFactor`, which only exist locally. This is also what finally gives `srsMap` the whole library rather than only the words that happened to be due.
- Every path that reschedules a word patches the cached row so the reminders follow: `submitReview` and `submitExercise` both call `patchCachedUserWord`.

The reminder merges two sources and settles conflicts by **date, not by origin**: `latestDueMs` takes the later of the library's `dueAt` and the local `nextReviewDate` per word, and an item survives only if that latest schedule is in the past. Without it a word reviewed through the quiz flow (which moves the local entry) would be re-announced from a stale cached row. `resolveWord` also drops local SRS keys the library has never heard of, which is what stops flashcard sessions — keyed by `userWordId`, see `mapFlashcardExerciseToWord` — from announcing "Word #123".

**There is no due-count badge.** `BottomNav` and `HomeDashboard` show no number, on purpose: the honest count is what `/reviews/due` answers, and printing it anywhere else would mean asking for it everywhere else.

### Failures are enveloped; successes are not

A rejected request answers with `{ success: false, error: { statusCode, message }, timestamp, path }`. A **successful** one is the raw payload — there is no `{ success: true, data }` wrapper to unwrap, so mappers keep reading the body directly.

[src/lib/api/client.ts](src/lib/api/client.ts) is the only place that knows this. `requestAsync` turns the envelope into an `ApiError` and every caller keeps catching just that:

- `error.message` may be a **string or `string[]`** (validation errors, joined with newlines). The older bare shape (`{ message, error, statusCode }`) is still read as a fallback, since not every route was migrated.
- `error.statusCode` wins over the HTTP status — it is what the backend means. `success: false` is also checked on a **2xx** body, so a failure delivered with a 200 still throws instead of being handed back as a payload.
- The last-resort message is never `response.statusText`: HTTP/2 carries no reason phrase, so it is empty in the browser and `AuthScreen` would print a blank error.
- `isFailureEnvelope` rejects arrays on purpose — `POST /words/bulk` answers with an **array** of per-word `{ headword, success }` results, which is a different `success` with a different meaning (see `BulkAddWordResult`).

A backend rejection is permanent, unlike a network error, so the add-word paths in [AddWordModal](src/components/dashboard/AddWordModal.tsx) split on `err.isNetworkError`: a network failure keeps the silent degrade-to-local close, while a `success: false` (e.g. `422 Word not found` from `POST /words`) holds the modal open and names the reason — the local copy stands, so it reads as "saved here, not synced" and the submit button locks to stop a second local copy.

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

`GET /reviews/due` sends no `userId` — the account comes from the bearer token. Each row is a `BackendDueReview` (`BackendUserWord` + an optional embedded `word` carrying `definitions[].examples[]`); `mapBackendWordToWord` turns that into a full `Word`, and `resolveWordForUserWord` prefers it over the local copy, falling back to `createPlaceholderWord` only when the row has no embed and the device has never seen the word. `hydrateFromApi` adopts words the local library is missing — from `GET /words` now, not from the due list.

### Home counters come from `/stats/summary`

[src/lib/api/stats-client.ts](src/lib/api/stats-client.ts) maps `GET /stats/summary` (`todayLearntWord`, `totalWords`, `learningWord`, `masteredWord`, `streak`, `weeklyActivity`) into `StatsSummary`. `page.tsx` holds it in `statsSummary`, refreshed on account load, on landing back on the home tab, and after a word syncs; `HomeDashboard` prefers it and falls back to `deriveProgress`/`buildActivitySeries` while it is null.

`streak` is the one field mapped as **optional** (`toOptionalCount`) rather than defaulting to 0, because it is folded into `displayProgress` — which the header, stats and profile screens all read. Missing means "keep the local streak"; a real `0` overrides it. `bestStreak` only ever follows it up.

`weeklyActivity` is keyed by **weekday name**, not date, and its key order is not display order — `buildRemoteActivitySeries` lays the names over the last 7 calendar days so labels and `isToday` stay real. Seven days is the ceiling: beyond that the names repeat and an older bucket would reuse a newer day's count.

### The profile word library reads `GET /words`

[src/components/profile/WordLibrarySection.tsx](src/components/profile/WordLibrarySection.tsx) pages the account's whole library, 10 per page, off `fetchUserWords()` in [src/lib/api/word-client.ts](src/lib/api/word-client.ts), and exports every page via `fetchAllUserWords()`. A row opens [WordDetailModal](src/components/profile/WordDetailModal.tsx), which is the flashcard laid out as a read-only detail view: headword + IPA + audio on top, then the senses paged one at a time — except it lists *every* example of the current sense instead of only the primary one, and has nothing to flip or rate.

The endpoint answers `{ items, pageNumber, pageSize, totalItems, totalPages }`, and each row is a **flattened** word: the word's own columns plus the account's `status` / `dueAt` / `isFavorite` folded in at the top level, with no `createdAt` and no other user-word column. That is why `BackendWord.createdAt` is optional and `BackendWordListItem` carries the three progress fields.

It is still absent from `/api-json`, so `fetchUserWords` reads the response defensively and normalizes every shape to one `UserWordsPage`:

- A **bare array** is taken as the whole library and sliced locally — which is also what a backend that ignores `page`/`pageSize` returns.
- An **envelope** may name its rows `data`/`items`/`words`/`results`, its count `total`/`totalItems`/`count`/`totalPages`, and its page `page`/`pageNumber` (top level or under `meta`).
- A row may be a flattened `BackendWordListItem` or an `AddWordResponse`-style `{ word, userWord }`; `splitListRow` reduces both to a word plus a partial user-word, so the status pill does not depend on which shape arrived. An unrecognised `status` string yields no pill rather than a wrong one.
- `isTotalExact` is **false** when the count had to be inferred from `totalPages` or from the page offset. The UI must not print an inferred number as the library size — it shows the visible range instead. `fetchAllUserWords` stops on a short page and hard-stops at `MAX_EXPORT_PAGES`, so a backend that ignores `page` cannot loop.

On failure the section still renders its local-library fallback (`allWords`) behind an amber "đang hiển thị dữ liệu lưu trên thiết bị này" notice. The first read shows a single spinner panel (no skeleton rows); a refresh keeps the previous rows dimmed under a spinner rather than emptying the section.

#### The library is cached in localStorage and read once

`getUserWordLibrary()` is the entry point, **not** `fetchUserWords`/`fetchAllUserWords` — it answers from `loadWordLibraryCache()` (`memorize_word_library`, per-account, versioned) and only pages the endpoint on a miss. The section therefore fetches **once**, holds the whole library in state, pages and exports it client-side, and never re-reads it on a tab switch or re-render.

It is also the app's source of truth for **what is due** — `useDueReminders` and `hydrateFromApi` read it, not `/reviews/due` — so keeping it current is not just a profile-screen concern.

What invalidates it:

- **Adding words** — `addWord`/`addWordsBulk` call `invalidateUserWordLibrary()` alongside `invalidateDueReviews()`. This is the only thing that drops the cache.
- **A review** does *not* refetch: `submitReview` and `submitExercise` patch that one cached row's `state`/`dueAt` via `patchCachedUserWord`, keeping `fetchedAt` so the row rewrite does not pose as a fresh read.
- **The refresh button** in the section header (`force: true`).
- **Sign-out**, through `clearScopedData()`.

Two details worth keeping:

- The mount effect keys off `allWords.length`, so a word added while the profile is open reloads the list — and since the add already dropped the cache, that reload is the one request that goes out. `allWords`/`srsMap` are read through a ref precisely so a new object identity does *not* re-run it.
- `readCachedUserWordLibrary()` is synchronous so a cache hit never flashes a spinner, and `withLocalOnly()` prepends any local word the cached list has never heard of — a word added while the backend was unreachable must not vanish from the library.

### Excel columns live in one place

[src/lib/wordExcel.ts](src/lib/wordExcel.ts) owns `VOCAB_HEADERS`, and both the import template (`downloadSampleExcel` in `AddWordModal`) and the profile export build their sheets from it. The importer's `getRowVal` matches incoming columns against these exact labels, so an export must use them verbatim or it will not import back. The two export-only columns (`Trạng thái`, `Ngày thêm`) are appended last and match none of the importer's aliases, so they are ignored on re-import.

### Auth is mandatory

There is no demo mode, no guest mode and no bundled vocabulary. A user must log in or register before any feature is reachable, and the whole word library is what that account added.

- `AuthScreen` only ever calls `onLoginSuccess` with a real `AuthSession` from `/auth/login` or `/auth/register`.
- `getCurrentUserId()` returns `number | null` — **never invent an id**. `getDueReviews()` returns `[]` and `AddWordModal` skips the POST when it is null, because a fabricated id writes into someone else's account.
- A new account legitimately has zero words. Guard anything that assumes a non-empty library (`handleStartQuiz` opens `AddWordModal` instead of an empty session; `ReviewDashboard` shows an empty-library state).

### Known incomplete integration points

These are stubs, not bugs to "fix" incidentally — check before changing:

- **Social login**: removed, not implemented. There is no OAuth backend, so the Apple/Google buttons were deleted rather than left as fake sign-ins.
- **Display name**: comes from `GET /users/profile` (`{ userId, name, email }`), which `login`/`register` fold into the stored `AuthSession` and the mount effect re-reads via `refreshProfile()`. The profile call is optional — on failure `getDisplayName` falls back to the email local-part. Local priority is: name typed at registration → profile name → previously stored name. `PATCH /users/name` writes it back — `updateName()` folds the answer into the stored session and hands it to `applySession()` in `page.tsx`, which regenerates the avatar (it is derived from the name). `PATCH /users/password` (`{ currentPassword, newPassword }`) leaves the token valid, so nothing is re-stored. Both are driven by [EditProfileModal](src/components/profile/EditProfileModal.tsx), opened by the pencil button on the profile header; **settings** are reached from the header bar, not from there. Email is read-only — no endpoint changes it.
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
- **Audio** ships no assets — [src/lib/audio.ts](src/lib/audio.ts) uses Web Speech API for pronunciation and a Web Audio oscillator engine (`soundFX`) for UI sounds. Where the backend supplies a recording (`Word.audioUrl`, `exercise.audioUrl`) it is played first and `speakWord` is the fallback, as in `WordDetailModal` and `ListeningQuiz`.
- XP/leveling constants are inline in `page.tsx`: 5 XP per correct + 10 completion bonus, 20 XP per custom word, level = `floor(xp / 300) + 1`.
