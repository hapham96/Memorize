# API Request: `GET /users/:id` — User Profile & Progress

**From:** Memorize frontend
**To:** Backend team
**Status:** Draft / proposal
**Base URL in use:** `https://memoraisebe.onrender.com` (no `/api` prefix — see [Notes](#notes-on-the-current-api))

---

## 1. Why we need this

Right now the only user information the API exposes is the JWT `sub` claim (numeric user id). There is no endpoint that returns anything about the user, so the app has to keep **all** profile and progress data in browser `localStorage`.

That causes three concrete problems:

1. **Progress does not survive a device change.** XP, level, streak, daily goal, quiz history and accuracy live only in the browser that produced them. Signing in on a phone shows a brand-new account with 0 XP even though the same user has weeks of history on desktop.
2. **We have no name to show.** `POST /auth/register` accepts only `email` and `password`, so the app currently derives a display name from the email local-part (`ha.pham@…` → "ha.pham"). The registration form asks for a full name and then has nowhere to send it.
3. **Numbers cannot be trusted.** Because XP and streaks are computed and stored client-side, they can be edited by anyone with devtools, and they silently reset when browser storage is cleared.

A single read endpoint returning the user's profile and aggregate progress solves all three.

---

## 2. Requested endpoint

### Request

```http
GET /users/:id
Authorization: Bearer <accessToken>
Accept: application/json
```

| Part | Value | Notes |
|---|---|---|
| Method | `GET` | |
| Path | `/users/:id` | `:id` is the numeric user id (same value as the JWT `sub` claim) |
| Auth | `Authorization: Bearer <accessToken>` | The token already returned by `/auth/login` and `/auth/register` |

**Query parameters (all optional):**

| Param | Type | Default | Description |
|---|---|---|---|
| `sessionLimit` | integer (0–100) | `20` | How many recent quiz sessions to include in `recentSessions`. `0` omits the array. |
| `include` | comma-separated string | all | Subset of top-level blocks to return, e.g. `include=stats,settings`. Lets the app do a cheap poll for just `stats`. |

**Request body:** none.

> **One request on top of the spec as written:** please also accept `GET /users/me` as an alias that resolves `:id` from the token. It saves the client from decoding the JWT just to build a URL, and it removes the whole class of "user A requests user B's id" bugs. If only one of the two can be built, we would rather have `/users/me`. Either way, `/users/:id` **must** reject a mismatch between `:id` and the token subject — see the error table below.

### Response — `200 OK`

```json
{
  "id": 5,
  "email": "ha.pham@sw.innova.com",
  "displayName": "Ha Pham",
  "avatarUrl": null,
  "createdAt": "2026-06-02T03:55:35.000Z",

  "stats": {
    "xp": 1240,
    "level": 5,
    "currentStreak": 7,
    "longestStreak": 14,
    "lastActiveAt": "2026-08-16T09:12:00.000Z",
    "wordsLearned": 42,
    "masteredCount": 12,
    "totalReviews": 210,
    "correctReviews": 178
  },

  "dailyGoal": {
    "target": 20,
    "completedToday": 12,
    "date": "2026-08-16"
  },

  "settings": {
    "theme": "light",
    "soundEnabled": true,
    "notifications": true,
    "focusCategories": ["IELTS", "Business"]
  },

  "favorites": [12, 44, 61],

  "recentSessions": [
    {
      "id": 901,
      "completedAt": "2026-08-16T09:12:00.000Z",
      "quizType": "flashcards",
      "totalQuestions": 10,
      "correctCount": 9,
      "xpEarned": 55
    }
  ]
}
```

### Error responses

| Status | When | Body |
|---|---|---|
| `401 Unauthorized` | Missing, malformed or expired token | `{ "message": "Unauthorized", "statusCode": 401 }` |
| `403 Forbidden` | `:id` does not match the token subject | `{ "message": "Forbidden", "error": "Forbidden", "statusCode": 403 }` |
| `404 Not Found` | No user with that id | `{ "message": "User not found", "error": "Not Found", "statusCode": 404 }` |

Existing error shape (`{ message, error, statusCode }`, where `message` may be a string or an array of strings) is fine — the client already handles both forms.

---

## 3. Field reference

### Root

| Field | Type | Required | Where the app uses it |
|---|---|---|---|
| `id` | integer | yes | Key for per-account local caching |
| `email` | string | yes | Profile screen subtitle |
| `displayName` | string \| null | yes | Header greeting, profile screen. Fall back to email local-part when null |
| `avatarUrl` | string \| null | no | Profile + header avatar. When null we generate an initials avatar locally |
| `createdAt` | ISO 8601 string | no | "Member since" (not shown yet) |

### `stats`

| Field | Type | Derivation on your side | Where the app uses it |
|---|---|---|---|
| `xp` | integer | Sum of XP awarded | Header XP badge, profile level bar |
| `level` | integer | `floor(xp / 300) + 1` | Header + profile badge. Send it so the formula lives in one place; we will use it verbatim |
| `currentStreak` | integer | Consecutive days with ≥1 review, ending today or yesterday | Header flame badge, stats card |
| `longestStreak` | integer | All-time best | Stats card ("Best: N days") |
| `lastActiveAt` | ISO 8601 string | Timestamp of last review | Streak rollover logic |
| `wordsLearned` | integer | `COUNT(user_words WHERE status != 'new')` | Home + stats "Words Learned" |
| `masteredCount` | integer | `COUNT(user_words WHERE status = 'mastered')` | Home + stats "Mastered" |
| `totalReviews` | integer | Total review submissions | Stats "Reviews Done", accuracy denominator |
| `correctReviews` | integer | Reviews with `quality >= 3` | Accuracy numerator |

`wordsLearned`, `masteredCount` and `favorites` are already derivable from the existing `user_words` table — no new tracking required for those four fields.

### `dailyGoal`

| Field | Type | Notes |
|---|---|---|
| `target` | integer | User-configured goal (app currently offers 5 / 10 / 20 / 30) |
| `completedToday` | integer | Words reviewed since local midnight |
| `date` | `YYYY-MM-DD` | The day `completedToday` refers to, so the client can detect a stale value |

**Timezone question:** we need to agree on which midnight defines "today" and "consecutive day" — see [Open questions](#5-open-questions).

### `settings`

| Field | Type | Allowed values |
|---|---|---|
| `theme` | string | `light` \| `dark` \| `system` |
| `soundEnabled` | boolean | |
| `notifications` | boolean | |
| `focusCategories` | string[] | `IELTS`, `TOEIC`, `TOEFL`, `Daily Life`, `Business`, `Academic`, `Travel`, `Technology`, `Emotions`, `Idioms & Phrasal Verbs`, `Custom` |

Syncing settings is lower priority than progress — see priorities below.

### `favorites`

Array of numeric `wordId`s the user has favorited. The `user_words` table already carries `isFavorite`, so this is a filter over existing data.

### `recentSessions`

| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `completedAt` | ISO 8601 string | |
| `quizType` | string | `flashcards` \| `multiple-choice` \| `fill-blank` \| `type-word` |
| `totalQuestions` | integer | |
| `correctCount` | integer | |
| `xpEarned` | integer | |

Used for the stats screen's quiz history list, the 28-day activity heatmap and the home screen's 7-day bar chart. All three are currently drawn from local data only, so they go blank on a new device.

**Not requested:** achievements. The app computes those client-side from the counters above, and we would rather not couple achievement definitions to the backend.

---

## 4. Companion write endpoints

The read endpoint alone would always return zeros, because nothing on the server currently records XP, streaks or quiz sessions. To make the data real we also need at least one write path. Listed roughly in priority order:

| Endpoint | Purpose |
|---|---|
| `POST /users/:id/sessions` | Record a finished quiz session (`quizType`, `totalQuestions`, `correctCount`). Server awards XP and updates streak, then returns the updated `stats` block. Server-authoritative so XP cannot be forged. |
| `PATCH /users/:id` | Update `displayName`, `avatarUrl`, `settings` and `dailyGoal.target`. |
| `PATCH /reviews/:userWordId/favorite` | Toggle `isFavorite`. Currently favorites are local-only. |

Also: **please add an optional `displayName` to `RegisterDto`** so the name collected at sign-up is not thrown away.

Current XP rules the app applies locally, for reference if you implement server-side awarding:

- 5 XP per correct answer
- 10 XP completion bonus per quiz session
- 20 XP per custom word added
- Level = `floor(xp / 300) + 1`

---

## 5. Open questions

1. **Timezone for "today" and streaks.** Server UTC, or a per-user timezone/UTC-offset field? Streaks computed in UTC will break for users in UTC+7 who study in the evening. Our preference: store a `timezone` on the user and compute day boundaries there.
2. **Should `level` be server-computed or client-computed?** We propose server, with the client just rendering it.
3. **`quizType` vocabulary.** Can we agree on the four string values above so history entries render consistently?
4. **`sessionLimit` cap.** Is 100 acceptable, or should this be a separate paginated endpoint?
5. **Token lifetime.** The current JWT has a 365-day expiry with no refresh flow. Out of scope for this request, but worth a look.

---

## 6. Priorities

We can ship incrementally — the client already degrades to local data when a field is absent, so a partial response is safe to deploy.

| Priority | Fields | Why |
|---|---|---|
| **P0** | `id`, `email`, `displayName`, `stats.*`, `dailyGoal.*` | Unblocks cross-device progress, which is the core problem |
| **P1** | `recentSessions`, `favorites` | Restores history, heatmap and favorites on a new device |
| **P2** | `settings`, `avatarUrl` | Convenience; local defaults are acceptable meanwhile |

---

## Notes on the current API

Facts the frontend is working against today, in case any are unintentional:

- The deployed service serves routes at the **root**, not under `/api` — `POST /api/auth/login` returns 404 while `POST /auth/login` works. The OpenAPI document at `/api-json` lists paths without a prefix and has an empty `servers` array.
- Endpoints currently available: `POST /auth/register`, `POST /auth/login`, `POST /words`, `POST /reviews/{userWordId}`, `GET /reviews/due`, `GET /health/db`.
- `GET /reviews/due` ignores the `userId` query parameter and resolves the user from the token. Verified: calling `/reviews/due?userId=7` with user 6's token returns user 6's rows. Same for `POST /words` — the `userId` we send in the body is ignored and the row is created for the token subject. **This is the behaviour we want everywhere**, and it is the reason we would prefer `/users/me` over `/users/:id`. If `userId` is permanently ignored, consider dropping it from `AddWordDto` and from the `/reviews/due` contract so clients stop sending a value that does nothing.
- JWT payload is `{ sub, iat, exp }`; `sub` is the numeric user id.
- Both auth endpoints return `{ "accessToken": "..." }` and nothing else.
- Test accounts created while verifying the above: user ids 2–7, emails `claudetest*@example.com`. Feel free to purge them.
