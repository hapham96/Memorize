# Vocabulary Battle — hướng dẫn cho FE (MemorizeFE)

Tài liệu tóm tắt để code tính năng **Vocabulary Battle** (thi đấu từ vựng real-time, 2–4 người) trên MemorizeFE, dùng backend MemoRaise sẵn có.

> **Nguồn chính:** `MemoRaise/docs/battle-protocol.md` (repo backend). Nếu file này lệch với file đó, tin file đó. Thuật ngữ (Battle Room, Host, Battle Question, Link, Turn…) giữ đúng tên trong `MemoRaise/CONTEXT.md`.
>
> **Tham khảo cài đặt:** web `MemoraiseVisualize` đã làm xong toàn bộ tính năng này (React 19 + Vite). Các file nên copy pattern: `src/hooks/useBattle.ts`, `src/services/battleState.ts` (+ `battleState.test.ts`), `src/types/battle.ts`, `src/hooks/useNow.ts`, `src/pages/BattlePage.tsx`, `src/components/battle/*`.

---

## 1. Bức tranh tổng thể

- **Server quyết định mọi thứ**: chấm đúng/sai, tính điểm, đếm giờ, đổi lượt. Client **chỉ hiển thị** và gửi lựa chọn của người chơi. Không bao giờ tự chấm điểm hay tự kết thúc câu hỏi ở client.
- Live battle chạy qua **socket.io**, namespace `/battles`. REST chỉ dùng cho **lịch sử** (`GET /battles/history`) và **danh sách Topic** (`GET /topics`).
- Battle **không ảnh hưởng** SM2, Streak hay Leaderboard. Điểm Battle chỉ tồn tại trong trận đó.

### Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| **Battle Room** | Phòng chờ 2–4 người, vào bằng mã 6 ký tự hoặc link mời. Phòng tồn tại qua nhiều trận. Mỗi User chỉ ở tối đa 1 phòng. |
| **Host** | Người chọn mode, Word Pool, thời lượng, và bấm bắt đầu. Host rời phòng thì quyền chuyển cho người vào sớm nhất còn lại. |
| **Battle** | Một trận trong phòng. Chỉ những người có mặt lúc bắt đầu được chơi, không ai vào giữa trận. |
| **Battle Mode** | `recall` / `match` / `chain` (Word Chain). |
| **Battle Question** | Một câu hỏi có giới hạn 20 s (một câu Recall, hoặc một bảng Match). |
| **Word Pool** | Tập từ để ra câu hỏi: Random (toàn catalog) hoặc một hay nhiều Topic, có thể lọc theo CEFR. |
| **Battle Points** | Điểm trong trận (có thể âm). |
| **Link / Turn / Life** | Word Chain: mỗi từ nối là một Link, mỗi lượt là một Turn, mỗi người có 3 Life. |

### 3 mode

- **Recall**: hiện 1 định nghĩa và 4 headword. Mỗi người **chỉ được chọn 1 lần**. Câu kết thúc sớm khi mọi người còn kết nối đều đã trả lời.
- **Match**: bảng chung có 4 headword và 4 definition. Ai ghép đúng trước thì giành cặp đó. Được thử nhiều lần, mỗi lần sai bị −40 và cặp vẫn mở cho người khác. Bảng kết thúc sớm khi cả 4 cặp đã có người giành.
- **Word Chain**: chơi theo lượt, mỗi người gõ 1 từ bắt đầu bằng chữ cái cuối của từ trước. Không có câu hỏi, Word Pool hay tổng thời gian. Người còn Life cuối cùng thắng.

### Tính điểm (Recall / Match)

- Đúng: `round(100 − 90 × min(t, 20s) / 20s)`, tức từ 100 giảm tuyến tính xuống tối thiểu 10. `t` tính từ lúc câu mở đến lúc **server nhận** câu trả lời, trừ 300 ms bù độ trễ.
- Sai: **−40**. Tổng điểm có thể âm.
- Đồng điểm thì đồng hạng: 100, 100, 80 thành hạng 1, 1, 3.
- Word Chain: điểm bằng số Link đã nối. Xếp hạng theo **thứ tự bị loại** (bị loại càng muộn hạng càng cao), không theo điểm.

---

## 2. Kết nối socket

```ts
import { io } from "socket.io-client";

const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/battles`, {
  auth: { token: accessToken },   // JWT thô, KHÔNG có "Bearer "
  transports: ["websocket"],
});
```

- Path mặc định `/socket.io`, CORS `*`. REST không có global prefix.
- Token sai hoặc hết hạn: server emit `battle:error` `{ code: 'unauthorized' }` rồi ngắt kết nối. Khi đó hiển thị "phiên đăng nhập hết hạn".
- **Mỗi User chỉ có 1 socket battle.** Nếu mở tab thứ hai, socket cũ nhận `session:replaced` rồi bị ngắt. Hiển thị "Bạn đang chơi ở nơi khác, tải lại trang để chơi ở đây". Trạng thái này phải **dính luôn**: không để sự kiện `disconnect` sau đó ghi đè nó.
- **Reconnect** dùng cơ chế tự động của socket.io, không cần code thêm. Khi socket nối lại cho một User đang ở trong phòng, server tự gửi `room:state`. Nếu đang mở câu hỏi thì gửi thêm `battle:question`, nếu đang trong một Turn Word Chain thì gửi `chain:state`.
  - Nếu reconnect đúng lúc đang **reveal đáp án (2 s)** hoặc đang tải câu tiếp, client **chỉ nhận `room:state`**. Câu hỏi mới sẽ đến khi nó mở. `battle:question-ended` cũ không được gửi lại.
  - Khi mất kết nối, **giữ nguyên room đang có** trên màn hình và hiện banner "Mất kết nối — đang kết nối lại…".

### Gửi request (ack)

Mọi event client→server đều có ack: `{ ok: true, ...data }` hoặc `{ ok: false, error: { code, message } }`. Nên bọc thành Promise:

```ts
export class BattleRequestError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

async function request<T extends object>(
  socket: Socket, event: string, payload: unknown = {}, timeoutMs = 8_000,
): Promise<T> {
  if (!socket.connected) throw new BattleRequestError("offline", "Chưa kết nối.");
  let ack: Ack<T>;
  try {
    ack = await socket.timeout(timeoutMs).emitWithAck(event, payload);
  } catch {
    throw new BattleRequestError("timeout", "Server không phản hồi, thử lại.");
  }
  if (!ack.ok) throw new BattleRequestError(ack.error.code, ack.error.message);
  return ack;
}
```

`chain:link` nên dùng timeout **12 s**, vì server có thể phải tra từ điển bên ngoài.

---

## 3. Event

### Client → server

| Event | Payload | Ack data | Ai được gửi |
|---|---|---|---|
| `room:create` | `{}` | `{ room: RoomState }` | bất kỳ ai (tự rời phòng hiện tại) |
| `room:join` | `{ code }` | `{ room: RoomState }` | bất kỳ ai (tự rời phòng hiện tại **trước**, kể cả khi join thất bại vì `battle_running`) |
| `room:leave` | `{}` | `{}` | thành viên |
| `room:configure` | `BattleConfig` | `{ room: RoomState }` | Host, trong lobby |
| `battle:start` | `{}` | `{}` | Host, trong lobby, phòng có ≥ 2 người |
| `battle:answer` | `{ questionId, headword }` | `AnswerResult` | người chơi, Recall |
| `battle:match` | `{ questionId, headwordId, definitionId }` | `AnswerResult` | người chơi, Match |
| `chain:link` | `{ word }` | `{ link: ChainLink }` | người đang có Turn, Word Chain |

Lưu ý:
- `room:configure` với `mode: 'chain'` **vẫn bắt buộc** gửi `wordPool` và `durationSeconds` hợp lệ. Cứ gửi nguyên config hiện tại của phòng, chỉ đổi `mode`.
- `room:configure` được validate **trước** khi kiểm tra quyền Host. Người không phải Host gửi config sai sẽ nhận `invalid_config` thay vì `not_host`. Tốt nhất **chỉ cho Host thấy form cấu hình**; người khác chỉ xem.
- Sau ack của `battle:start`, server gửi `room:state` (`status: 'in_battle'`), rồi **một lúc sau** mới có `battle:question` hoặc `chain:state` đầu tiên. Cần một trạng thái "Đang chuẩn bị…" ở giữa.

### Server → client

| Event | Payload | Khi nào |
|---|---|---|
| `room:state` | `RoomState` | mỗi khi thành viên, Host, config hoặc status thay đổi |
| `battle:question` | `QuestionView` | mỗi câu hỏi mới, và khi reconnect |
| `battle:progress` | `ProgressView` | có người trả lời. Recall: ai đã trả lời (không lộ đáp án). Match: cặp nào đã bị ai giành. |
| `battle:question-ended` | `QuestionResult` | câu đã được trả lời hết hoặc hết 20 s. Reveal 2 s rồi câu tiếp mở. **Không** có event này nếu câu bị cắt vì hết tổng thời gian trận; khi đó `battle:ended` đến thẳng. |
| `chain:state` | `ChainView` | Word Chain: lúc bắt đầu, khi bắt đầu/xong kiểm tra một Link (kể cả khi kiểm tra bị bỏ sau 10 s), sau mỗi Link hợp lệ, mỗi Turn hết giờ, khi có người rời, và khi reconnect |
| `battle:ended` | `BattleResult` | hết tổng thời gian, hoặc chỉ còn 1 người chơi (mọi mode). **Ngay sau đó** có `room:state` với `status: 'lobby'`, `battle: null`, `lastResult` đã có giá trị. |
| `session:replaced` | `{}` | một socket khác đã lấy phiên của User này |
| `battle:error` | `{ code, message }` | lỗi ở cấp kết nối (thực tế chỉ có `unauthorized`) |

### Kiểu dữ liệu

Đặt ở `src/types/battle.ts`. Có thể copy từ `MemoraiseVisualize/src/types/battle.ts`.

```ts
export type BattleMode = "recall" | "match" | "chain";
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type WordPool =
  | { kind: "random"; cefrLevels?: CefrLevel[] }
  | { kind: "topics"; topicIds: number[]; cefrLevels?: CefrLevel[] };
// Server trả lại pool kèm `topicNames?: string[]` (khi kind = topics). Không cần gửi field này lên.
// `cefrLevels` rỗng sẽ bị bỏ, trùng sẽ bị gộp.

export interface BattleConfig {
  mode: BattleMode;
  wordPool: WordPool;
  durationSeconds: 60 | 120 | 180;          // mặc định 120
}

export interface AnswerResult { correct: boolean; pointsDelta: number; points: number }

export type Ack<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: { code: string; message: string } };

export interface Member { userId: number; name: string; connected: boolean; joinedAt: string }

export interface RoomState {
  code: string;                             // 6 ký tự từ A–Z (không có I, O) và 2–9
  hostUserId: number;
  members: Member[];                        // tối đa 4, xếp theo joinedAt
  config: BattleConfig & { wordPool: WordPool & { topicNames?: string[] } };
  status: "lobby" | "in_battle";
  battle: null | {
    battleId: string;
    mode: BattleMode;
    endsAt: string | null;                  // ISO, hạn của cả trận; null với Word Chain
    participants: { userId: number; name: string; points: number; left: boolean }[];
  };
  lastResult: BattleResult | null;          // kết quả trận trước, hiển thị ở lobby
}

export interface QuestionView {
  questionId: string;
  index: number;                            // đếm từ 1 trong trận
  mode: BattleMode;
  startedAt: string;
  endsAt: string;                           // startedAt + 20 s, không vượt quá endsAt của trận
  serverNow: string;                        // để tính độ lệch đồng hồ
  recall?: { definition: string; partOfSpeech: string | null; options: string[] };  // 4 headword
  match?: {
    headwords: { id: string; text: string }[];      // 4
    definitions: { id: string; text: string }[];    // 4, thứ tự khác với headwords
  };
  answeredUserIds: number[];                // Recall
  claimed: { headwordId: string; definitionId: string; userId: number }[];  // Match
  points: Record<number, number>;           // điểm hiện tại của mọi người, theo userId
}

export interface ProgressView {
  questionId: string;
  answeredUserIds: number[];
  claimed: QuestionView["claimed"];
  points: Record<number, number>;
}

export interface QuestionResult {
  questionId: string;
  recallAnswer?: string;                    // headword đúng
  matchPairs?: { headwordId: string; definitionId: string }[];
  results: { userId: number; correct: boolean | null; pointsDelta: number }[];
  // Recall: correct = null nếu không trả lời.
  // Match: true = giành được ≥ 1 cặp; false = đã thử nhưng không giành được cặp nào;
  //        null = không thử. pointsDelta là tổng ròng của cả bảng.
  points: Record<number, number>;
}

export interface ChainLink { word: string; userId: number | null; definition: string | null }  // userId null = Starting Word

export interface ChainView {
  links: ChainLink[];                       // cả chuỗi, cũ nhất trước
  nextLetter: string;                       // chữ cái Link tiếp phải bắt đầu
  turnUserId: number | null;
  turnStartedAt: string;
  turnEndsAt: string;
  turnMs: number;                           // 15 s, giảm 1 s sau mỗi vòng, tối thiểu 8 s
  serverNow: string;
  checking: boolean;                        // đang kiểm tra Link, đồng hồ TẠM DỪNG
  pausedMsLeft: number | null;              // khi checking: thời gian còn lại bị đóng băng (turnEndsAt lúc này không còn đúng)
  players: { userId: number; name: string; lives: number; eliminated: boolean; links: number }[];
}

export interface BattleResult {
  battleId: string;
  mode: BattleMode;
  standings: { userId: number; name: string; points: number; placing: number; left: boolean }[];
  // Word Chain: xếp theo placing; mode khác: xếp theo điểm
}
```

---

## 4. Quản lý state: một reducer thuần

Gom mọi event socket vào **một reducer thuần**, có thể test mà không cần socket. Có thể copy nguyên `battleState.ts` của MemoraiseVisualize (kèm file test).

```ts
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "replaced" | "unauthorized";

export interface BattleState {
  connection: ConnectionStatus;
  room: RoomState | null;
  question: QuestionView | null;
  reveal: QuestionResult | null;   // kết quả câu vừa xong, hiện trong 2 s reveal
  chain: ChainView | null;
  result: BattleResult | null;     // trận vừa xong, giữ đến khi người chơi đóng
  points: Record<number, number>;
  clockOffset: number;             // đồng hồ server − đồng hồ client (ms)
}
```

Các quy tắc reducer **bắt buộc** phải đúng:

1. `disconnected` **không ghi đè** `replaced` hoặc `unauthorized`.
2. Khi nhận `room:state`:
   - Nếu `status === 'in_battle'`, lấy điểm từ `room.battle.participants[].points`.
   - Nếu không, xoá `question`, `reveal` và `chain` (trận đã xong).
3. Khi nhận `battle:question`: đặt `question`, xoá `reveal` và `result`, lấy `points` từ câu hỏi, và tính lại `clockOffset`.
4. `battle:progress` và `battle:question-ended`: **bỏ qua nếu `questionId` khác câu hiện tại** (vẫn cập nhật điểm từ progress).
5. Khi nhận `chain:state`: đặt `chain` và tính lại `clockOffset`.
6. Khi nhận `battle:ended`: xoá `question`, `reveal` và `chain`; đặt `result`.
7. Nhớ xử lý trường hợp **hết giờ cả trận giữa câu**: không có `question-ended`, chỉ có `battle:ended`. Quy tắc 6 đã xử lý trường hợp này.

### Đồng hồ và độ lệch giờ

Không bao giờ dùng `Date.now()` trực tiếp để so với deadline của server.

```ts
// Lúc nhận battle:question hoặc chain:state:
clockOffset = Date.parse(view.serverNow) - receivedAt;   // receivedAt = Date.now() lúc nhận event

// Số ms còn lại tới một deadline (ISO, tính theo giờ server):
export function msLeft(deadline: string, clockOffset: number, now = Date.now()) {
  return Math.max(0, Date.parse(deadline) - (now + clockOffset));
}

// Hook tick để render đếm ngược (100 ms là đủ mượt)
export function useNow(intervalMs = 100, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
```

- Thanh 20 s của câu hỏi: `msLeft(question.endsAt, …)`. Độ dài thanh: `endsAt − startedAt`. Đừng hard-code 20 000 ms, vì câu cuối có thể ngắn hơn do bị giới hạn bởi `endsAt` của trận.
- Đồng hồ cả trận: `msLeft(room.battle.endsAt, …)`. Với Word Chain giá trị này là `null`, nên ẩn đồng hồ.
- Word Chain: nếu `chain.checking`, hiển thị `pausedMsLeft` (đứng yên, kèm "Đang kiểm tra…"). Nếu không, dùng `msLeft(chain.turnEndsAt, …)`.
- Hết giờ ở client **không làm gì cả**: chỉ khoá nút và chờ server gửi event.

---

## 5. Luồng màn hình

```
BattleHome ──create/join──▶ RoomLobby ──battle:start──▶ (Đang chuẩn bị…)
    ▲                          ▲   │                          │
    │                          │   │ (Host) BattleConfigPanel  ▼
    └──room:leave──────────────┘   │               Recall/Match: BattleArena
                                   │               Word Chain:   ChainArena
                                   │                          │
                                   └──── battle:ended + room:state(lobby) ◀┘
                                         (hiện result, rồi về lobby với lastResult)
```

Chọn màn hiển thị theo state:

| Điều kiện | Màn |
|---|---|
| `connection === 'replaced'` | Thông báo "đang chơi ở nơi khác" |
| `connection === 'unauthorized'` | Yêu cầu đăng nhập lại |
| `room === null` | **BattleHome** |
| `room.status === 'lobby'` | **RoomLobby** (kèm overlay `result` nếu có) |
| `in_battle` và mode là `chain` | **ChainArena** (khi `chain === null` thì hiện "Đang chuẩn bị…") |
| `in_battle` và mode khác | **BattleArena** (khi `question === null` thì hiện "Đang chuẩn bị…" hoặc "Đang tải câu tiếp…") |

### BattleHome
- Nút **Tạo phòng** (`room:create`).
- Ô nhập **mã phòng** (`room:join`). Server tự trim và viết hoa, nhưng client cũng nên tự uppercase cho dễ nhìn.
- Mở bằng link mời `?code=XXXXXX` thì tự join.
- **Lịch sử** từ `GET /battles/history?limit=10`.

### RoomLobby
- Mã phòng và nút copy link mời (`${origin}/?code=XXXXXX`).
- Danh sách thành viên (tối đa 4) gồm tên, đánh dấu Host (`hostUserId`), và chấm online/offline (`connected`).
- **BattleConfigPanel**: Host chỉnh được, người khác chỉ xem. Gồm:
  - mode;
  - Word Pool: Random hoặc Topics (chọn nhiều Topic, lấy từ `GET /topics`);
  - chip CEFR A1–C2, chọn nhiều, để trống nghĩa là tất cả;
  - thời lượng 60/120/180 s. Ẩn Word Pool và thời lượng khi chọn `chain`, nhưng vẫn gửi giá trị cũ lên.
  - Mỗi lần đổi gửi `room:configure`. Nếu lỗi `pool_too_small`, hiện message của server.
- Nút **Bắt đầu**: chỉ Host thấy, và chỉ bật khi `members.length >= 2`.
- **Kết quả trận trước**: ưu tiên `state.result` (vừa xong), nếu không có thì dùng `room.lastResult`.
- Nút **Rời phòng** (`room:leave`), thành công thì reset state về ban đầu.
- Một thành viên mất kết nối quá 60 s ở lobby sẽ bị server xoá khỏi phòng. Client không cần làm gì.

### BattleArena (Recall / Match)
- Phần chung: đồng hồ cả trận, thanh 20 s của câu, số thứ tự câu (`index`), và bảng xếp hạng trực tiếp từ `points`.
- **RecallBoard**:
  - Hiện `definition` (kèm `partOfSpeech` nếu có) và 4 nút `options`.
  - Bấm một nút thì gửi `battle:answer { questionId, headword }` và **khoá cả 4 nút** (chỉ được 1 lần). Ack trả về `correct`, `pointsDelta`, `points`; hiện ngay +x hoặc −40.
  - Hiện avatar những người đã trả lời, lấy từ `answeredUserIds`.
- **MatchBoard**:
  - 2 cột: headwords và definitions. Người chơi chọn 1 headword và 1 definition, rồi gửi `battle:match`.
  - Cặp đã bị giành (trong `claimed`) thì khoá lại và tô màu theo người giành.
  - Ghép sai thì hiện −40 và bỏ chọn; người chơi được thử tiếp.
- **Reveal** (khi `reveal !== null`):
  - Recall: tô đáp án đúng (`recallAnswer`).
  - Match: hiện `matchPairs`.
  - Hiện `pointsDelta` của từng người. Sau khoảng 2 s câu mới sẽ tự đến.

### ChainArena (Word Chain)
- Chuỗi `links` (cuộn xuống cuối), mỗi Link kèm `definition` nếu có. Link có `userId === null` là Starting Word.
- Hiện to chữ `nextLetter`, cho biết đang là lượt của ai (`turnUserId`), và đồng hồ Turn (xem mục Đồng hồ).
- Danh sách người chơi: số Life (♥ × `lives`), đánh dấu `eliminated`, số Link đã nối.
- Ô nhập **chỉ bật khi `turnUserId === myUserId` và `!checking`**. Gửi `chain:link { word }`.
  - Thành công: ack trả về `{ link }`, và `chain:state` mới sẽ đến.
  - Lỗi `invalid_link`: hiện `error.message` và **giữ ô nhập để người chơi thử lại** trong cùng Turn (thời gian không bị trừ khi server đang kiểm tra).
- Hết Turn mà chưa có Link hợp lệ thì người chơi mất 1 Life. Hết Life thì bị loại. Rời phòng giữa trận thì bị loại ngay.

### Màn kết quả
- `BattleResult.standings`: `placing` (đồng hạng thì cùng số), tên, điểm, và nhãn "đã rời" nếu `left`.
- Word Chain: điểm là số Link. Ghi rõ "xếp hạng theo thời gian trụ lại".
- Nút đóng thì xoá `result`; lúc đó người chơi đã ở lobby (`room:state` lobby đã đến).

---

## 6. Mã lỗi và cách hiển thị

`error.message` là tiếng Anh, đọc được. Nên map `code` sang câu tiếng Việt cho UI, và dùng `message` làm phương án dự phòng.

| code | Khi nào | Gợi ý UI |
|---|---|---|
| `unauthorized` | token sai hoặc hết hạn | "Phiên đăng nhập hết hạn, hãy đăng nhập lại" |
| `internal` | lỗi server | "Có lỗi xảy ra, thử lại" |
| `offline` / `timeout` | *client tự sinh* (xem hàm `request`) | "Mất kết nối" / "Server không phản hồi" |
| `room_not_found` | mã sai, hoặc phòng đã đóng | "Không tìm thấy phòng" |
| `room_full` | phòng đã đủ 4 người | "Phòng đã đủ người" |
| `battle_running` | join, configure hoặc start khi đang có trận | "Phòng đang thi đấu, chờ trận xong" |
| `not_in_room` | | quay về BattleHome |
| `not_host` | | "Chỉ Host được làm việc này" |
| `not_enough_players` | start khi phòng < 2 người | "Cần ít nhất 2 người" |
| `invalid_config` | config sai | hiện message |
| `pool_too_small` | Word Pool có < 4 từ | "Không đủ từ — chọn thêm Topic hoặc level" |
| `question_closed` | câu đã đóng, đã trả lời rồi, hoặc cặp Match đã bị giành (không bị trừ điểm) | im lặng hoặc toast nhẹ |
| `not_your_turn` | | "Chưa tới lượt bạn" |
| `turn_over` | Turn đã hết, hoặc không có Word Chain nào đang chạy | "Hết lượt" |
| `checking` | Link trước còn đang kiểm tra | "Đang kiểm tra từ trước…" |
| `invalid_link` | Link sai: không phải 1 từ a–z ≥ 2 chữ cái, sai chữ cái đầu, trùng, không phải từ thật, không kiểm tra được (thử lại), hoặc "Your Turn is over." | hiện message, cho thử lại |

Lưu ý: ở Match, gửi `headwordId` hoặc `definitionId` **không có trên bảng** bị tính là sai (−40). Chỉ gửi id lấy từ `QuestionView`.

---

## 7. REST

### `GET /topics`
Trả về `{ id: number; name: string }[]`. Dùng để chọn Topic cho Word Pool.

### `GET /battles/history?limit=10`
JWT. `limit` từ 1 đến 100, mặc định 20. Trận mới nhất trước.

```ts
interface BattleHistoryResponse {
  items: {
    battleId: string;
    mode: BattleMode;
    wordPool: WordPool & { topicNames?: string[] };
    durationSeconds: number;              // Word Chain = 0
    startedAt: string;                    // ISO
    endedAt: string;
    participants: { userId: number; name: string; points: number; placing: number }[];  // xếp theo placing
  }[];
}
```

---

## 8. Port sang MemorizeFE

MemorizeFE dùng Next.js 14 App Router, React 18, Tailwind và framer-motion. **Không có router**: toàn bộ app nằm trong `src/app/page.tsx` (`'use client'`). **Không có store**: state dùng chung nằm trong `page.tsx` và truyền xuống bằng props.

1. **Cài thư viện:** `npm i socket.io-client@^4.8`.
2. **Types:** `src/types/battle.ts` (mục 3).
3. **REST clients** theo convention `src/lib/api/<x>-client.ts`, dùng `getAsync(path, { auth: true })` từ `src/lib/api/client.ts`:
   - `topic-client.ts`: `fetchTopics()` gọi `GET /topics`. Hiện MemorizeFE **chưa có** client này.
   - `battle-client.ts`: `fetchBattleHistory(limit)` gọi `GET /battles/history`.
4. **Reducer:** `src/lib/battle-state.ts`, gồm reducer thuần cùng `msLeft` và `rankByPoints` (mục 4).
5. **Hooks:**
   - `src/hooks/useBattle.ts`: tạo socket **bên trong `useEffect`** (bắt buộc, vì Next có SSR, không được tạo socket lúc render hoặc ở module scope). Effect phụ thuộc vào `accessToken`; cleanup gọi `removeAllListeners()` rồi `disconnect()`. Hook trả về `{ state, createRoom, joinRoom, leaveRoom, configure, start, answerRecall, answerMatch, submitLink, dismissResult }`.
   - `src/hooks/useNow.ts`.
6. **Token:** `loadAuthSession()?.accessToken` từ `src/lib/storage.ts`. Hàm này trả `null` và tự xoá session nếu đã hết hạn; khi đó không kết nối socket và yêu cầu đăng nhập. `myUserId` lấy bằng `getCurrentUserId()` trong `src/lib/api/auth-client.ts`. Truyền `key={accessToken}` cho màn Battle để nó remount khi đăng nhập lại.
7. **Components:** `src/components/battle/`, gồm `BattleScreen` (chọn màn theo bảng ở mục 5), `BattleHome`, `RoomLobby`, `BattleConfigPanel`, `BattleArena`, `RecallBoard`, `MatchBoard`, `ChainArena`, `Standings`.
8. **Gắn vào app:**
   - Thêm lối vào Battle trong `page.tsx`: một tab mới trong `ActiveTab` (`src/types/index.ts`) cùng `BottomNav`, hoặc một nút ở Home. Không cần đưa state battle lên `page.tsx`, vì `useBattle` sống trong `BattleScreen`. Chỉ cần `page.tsx` biết đang mở màn Battle.
   - Lưu ý: unmount `BattleScreen` sẽ ngắt socket. User vẫn ở trong phòng (60 s ở lobby, cả trận nếu đang thi đấu), và mở lại thì server tự gửi lại `room:state`.
9. **Link mời:** vì không có router, đọc `new URLSearchParams(window.location.search).get("code")` trong `useEffect` của `page.tsx`. Nếu có `code` thì mở màn Battle và gọi `joinRoom(code)`, rồi xoá query bằng `history.replaceState`.
10. **Text UI:** tiếng Việt, theo phong cách của app.

---

## 9. Checklist test tay

- [ ] Dùng 2 tài khoản ở 2 trình duyệt: tạo phòng, join bằng mã và bằng link mời.
- [ ] Không phải Host thì không chỉnh được config và không thấy nút Bắt đầu.
- [ ] Host rời phòng thì quyền Host chuyển cho người còn lại.
- [ ] Recall: chỉ trả lời được 1 lần; điểm giảm dần theo thời gian; sai bị −40; reveal hiện đáp án.
- [ ] Match: giành cặp, ghép sai bị −40, cặp đã giành bị khoá.
- [ ] Hết tổng thời gian giữa câu thì vào thẳng màn kết quả, không bị kẹt ở câu hỏi.
- [ ] Word Chain: Link sai thì thử lại được; khi đang "checking" đồng hồ đứng yên; hết Turn thì mất Life; hết Life thì bị loại; xếp hạng theo thứ tự bị loại.
- [ ] Tải lại trang giữa trận thì quay lại đúng câu hỏi hoặc Turn (hoặc chờ câu kế nếu đang reveal).
- [ ] Mở tab thứ hai thì tab cũ hiện "đang chơi ở nơi khác".
- [ ] Token hết hạn thì hiện yêu cầu đăng nhập lại.
- [ ] Lịch sử hiện đúng cả 3 mode (Word Chain không có thời lượng).
