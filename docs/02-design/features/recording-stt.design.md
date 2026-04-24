# Design: recording-stt (녹취록 자동 STT + Drive 재생)

- Feature: `recording-stt`
- Architecture: **Option B — Clean Architecture**
- Date: 2026-04-24
- Status: Design

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 녹취록 보관만으로는 가치가 낮음. 텍스트화로 검색·공유·학습 가능한 자산으로 전환 |
| **WHO** | 녹취록을 업로드하는 상담 담당자 + 공유받은 팀원 |
| **RISK** | Gemini 무료 티어 rate limit / API 키 유출 / 음성 Google 전송 동의 / 오탈자(편집 불가) |
| **SUCCESS** | 20MB 이하 녹취록 업로드 후 3분 내 STT done, 팀 공유 시 캐시 즉시 열람, API 키 평문 노출 0 |
| **SCOPE** | Gemini 2.5 Flash Lite 자동 STT + Drive iframe 재생 + 사용자별 키 관리. 텍스트 편집 제외 |

---

## 1. Overview

업로더의 Gemini API 키로 업로드 직후 비동기 STT를 실행하고, 결과를 DB 1곳에 캐싱한다. 재생은 Drive iframe 임베드. 레이어는 `api route → service → vault RPC / gemini SDK / drive API`로 명확히 분리한다.

### 1.1 전제
- Plan 문서의 FR/NFR/SC를 전부 충족해야 함
- 기존 Drive 업로드 플로우 유지 (`team-crm-drive.design.md` §5)
- Supabase Vault(pgsodium) 활성화 필요

---

## 2. Architecture

### 2.1 레이어 구조
```
┌─────────────────────────────────────────────────────────────┐
│ Client                                                      │
│  ├─ ProfileSettingsPage        (API 키 등록/삭제)             │
│  ├─ RecordingPanel (확장)       (상태·모달·재생)               │
│  └─ useGeminiKey / useTranscribe hooks                      │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS (Next.js Route Handlers)
┌──────────────▼──────────────────────────────────────────────┐
│ API Routes (Server)                                         │
│  ├─ POST   /api/profile/gemini-key                          │
│  ├─ DELETE /api/profile/gemini-key                          │
│  ├─ GET    /api/profile/gemini-key/status                   │
│  ├─ POST   /api/recordings/[id]/transcribe  (idempotent)    │
│  └─ GET    /api/recordings/[id]/transcribe  (polling)       │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ Services (Domain)                                           │
│  ├─ features/recordings/services/geminiStt.ts               │
│  │     transcribeAudio(fileBuffer, apiKey) → string         │
│  ├─ features/recordings/services/transcribeService.ts       │
│  │     runTranscribe(recordingId, userId) → Result          │
│  └─ features/auth/services/vaultService.ts                  │
│        setUserGeminiKey / getUserGeminiKey / hasKey         │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│ Integrations                                                │
│  ├─ @google/generative-ai  (Gemini SDK)                     │
│  ├─ Drive API  (alt=media with refresh token)               │
│  └─ Supabase RPC: set_user_gemini_key / get_user_gemini_key │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 STT 트리거 플로우
```
Client                         Server                          External
──────                         ──────                          ────────
uploadForm.submit
  │
  ▼  POST /api/recordings
                               Drive upload (기존)
                               INSERT recordings{
                                 transcript_status:'pending'
                               }
                               fire-and-forget:
                                 fetch(/api/recordings/[id]/transcribe, POST)
  ◄─── 200 OK (recording created)

                               ── 비동기 ──
                               transcribe route:
                                 - auth check
                                 - Vault RPC → decrypt key
                                 - Drive alt=media → Buffer
                                 - Gemini generateContent
                                                                  ───► Gemini API
                                                                  ◄─── transcript
                                 UPDATE recordings SET
                                   transcript, status='done',
                                   transcript_model, transcribed_at

polling every 5s
  │
  ▼  GET /api/recordings/[id]/transcribe
  ◄─── { status, transcript?, error? }
```

### 2.3 상태 기계
```
pending ──(transcribe route 시작)──► processing ──(성공)──► done
   │                                    │
   │                                    └─(실패)─► failed ──(재시도 버튼)─► processing
   │
   └─(키 없음/20MB 초과)─► failed
```

---

## 3. Data Model

### 3.1 마이그레이션 SQL

```sql
-- (1) pgsodium & Vault 확장 활성화
create extension if not exists pgsodium;
create extension if not exists vault with schema vault;

-- (2) users 테이블에 Vault secret id 보관
alter table public.users
  add column if not exists gemini_key_secret_id uuid references vault.secrets(id);

-- (3) recordings 확장
alter table public.recordings
  add column if not exists transcript text,
  add column if not exists transcript_status text
    not null default 'pending'
    check (transcript_status in ('pending','processing','done','failed')),
  add column if not exists transcript_model text,
  add column if not exists transcript_error text,
  add column if not exists transcribed_at timestamptz;

create index if not exists idx_recordings_transcript_status
  on public.recordings (transcript_status)
  where transcript_status in ('pending','processing');

-- (4) Vault RPC (SECURITY DEFINER)
create or replace function public.set_user_gemini_key(p_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing uuid;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;

  select gemini_key_secret_id into v_existing from public.users where id = v_user_id;

  if v_existing is not null then
    perform vault.update_secret(v_existing, p_key);
  else
    insert into vault.secrets (secret, name)
    values (p_key, 'gemini_key_' || v_user_id::text)
    returning id into v_existing;

    update public.users set gemini_key_secret_id = v_existing where id = v_user_id;
  end if;
end $$;

create or replace function public.get_user_gemini_key(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare v_secret_id uuid; v_key text;
begin
  -- 호출 가능 여부는 라우트에서 serviceRole로만 호출 (RLS 아닌 함수 권한으로 보호)
  select gemini_key_secret_id into v_secret_id from public.users where id = p_user_id;
  if v_secret_id is null then return null; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where id = v_secret_id;
  return v_key;
end $$;

revoke all on function public.get_user_gemini_key(uuid) from public, anon, authenticated;
grant execute on function public.get_user_gemini_key(uuid) to service_role;

grant execute on function public.set_user_gemini_key(text) to authenticated;

create or replace function public.delete_user_gemini_key()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare v_secret_id uuid; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;
  select gemini_key_secret_id into v_secret_id from public.users where id = v_user_id;
  if v_secret_id is null then return; end if;
  update public.users set gemini_key_secret_id = null where id = v_user_id;
  delete from vault.secrets where id = v_secret_id;
end $$;

grant execute on function public.delete_user_gemini_key() to authenticated;
```

### 3.2 TypeScript 타입 업데이트
`src/types/database.types.ts`의 `RecordingsRow`:
```ts
type RecordingsRow = {
  id: string; team_id: string; owner_user_id: string
  title: string; duration: number | null
  drive_file_id: string | null; drive_share_link: string | null
  consent_confirmed: boolean; is_shared: boolean; created_at: string
  transcript: string | null
  transcript_status: 'pending' | 'processing' | 'done' | 'failed'
  transcript_model: string | null
  transcript_error: string | null
  transcribed_at: string | null
}
```

---

## 4. API Contract

### 4.1 `POST /api/profile/gemini-key`
- Auth: 로그인 필수
- Body: `{ apiKey: string }` (min length 20, Zod 검증)
- 처리: `rpc('set_user_gemini_key', { p_key: apiKey })` (anon key client, auth.uid 기반)
- Response 200: `{ ok: true }`
- Response 400: `{ error: 'invalid_key', fieldErrors: {...} }`
- Response 401: `{ error: 'unauthorized' }`

### 4.2 `DELETE /api/profile/gemini-key`
- 처리: `rpc('delete_user_gemini_key')`
- Response 200: `{ ok: true }`

### 4.3 `GET /api/profile/gemini-key/status`
- Response 200: `{ registered: boolean }`
- 구현: `select gemini_key_secret_id is not null as registered from users where id = auth.uid()`
- 평문 키는 절대 반환 안 함

### 4.4 `POST /api/recordings/[id]/transcribe`
- Auth: 로그인 필수, 해당 recording의 owner여야 함
- 동작 (idempotent):
  1. `select * from recordings where id = :id and owner_user_id = auth.uid()`
  2. 상태가 `processing`이면 409 `{ error: 'already_processing' }`
  3. 상태를 `processing`으로 UPDATE
  4. `service_role` 클라이언트로 `rpc('get_user_gemini_key', { p_user_id: ownerId })`
  5. 키 없으면 `failed + transcript_error='no_api_key'` → 400
  6. Drive API `GET /drive/v3/files/{drive_file_id}?alt=media` → Buffer
  7. 20MB 초과면 `failed + transcript_error='file_too_large'` → 400
  8. `geminiStt.transcribeAudio(buffer, key, mimeType)` 호출
  9. 성공: `UPDATE transcript, transcript_status='done', transcript_model='gemini-2.5-flash-lite', transcribed_at=now()` → 200
  10. 실패 (429 Rate limit): `failed + transcript_error='rate_limited'` → 429
  11. 실패 (기타): `failed + transcript_error=<message>` → 500
- Response 200: `{ status: 'done', transcript: string }`
- Response 409: `{ error: 'already_processing' }`
- Response 429: `{ error: 'rate_limited', retryAfter?: number }`
- Response 500: `{ error: 'stt_failed', message: string }`

### 4.5 `GET /api/recordings/[id]/transcribe`
- Auth: 로그인 + (owner 또는 `is_shared=true`)
- Response 200:
  ```ts
  {
    status: 'pending' | 'processing' | 'done' | 'failed'
    transcript: string | null       // done일 때만
    error: string | null            // failed일 때만
    model: string | null
    transcribedAt: string | null
  }
  ```

### 4.6 `POST /api/recordings` (기존 확장)
기존 Drive 업로드 성공 후 마지막에 fire-and-forget 추가:
```ts
// transcript_status='pending'으로 생성된 직후
fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/recordings/${id}/transcribe`, {
  method: 'POST',
  headers: { Cookie: req.headers.get('cookie') ?? '' }
}).catch(() => {}) // 에러는 무시 (재시도는 UI에서)
```

---

## 5. UI Design

### 5.1 프로필 페이지 — API 키 등록 섹션
위치: `app/(authed)/profile/page.tsx` 하단에 새 섹션
```
┌─ Gemini API 키 (녹취록 자동 STT용) ─────────────────────────┐
│  [상태] ✅ 등록됨  /  ❌ 미등록                                │
│  [ ] AI...XXXXXXXX (마스킹)                                  │
│                                                              │
│  🔗 무료 API 키 발급받기 (외부 링크)                           │
│     → https://aistudio.google.com/apikey                     │
│                                                              │
│  [키 입력 ▭▭▭▭▭▭▭▭]   [저장]   [삭제]                        │
│                                                              │
│  ℹ️ 본인의 무료 Gemini API 키를 등록하면,                       │
│     업로드한 녹취록이 자동으로 텍스트로 변환됩니다.              │
│     키는 Supabase Vault로 암호화 저장됩니다.                   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 RecordingPanel 카드 확장
```
┌──────────────────────────────────────────────────┐
│ 🎙️ 홍길동님 상담 (2026-04-20)                     │
│    32분 15초 · ✅ STT 완료                         │
│                                                  │
│    [▶ 재생]  [📄 텍스트 보기]  [공유 🟢]          │
└──────────────────────────────────────────────────┘

상태별 표시:
  pending     → "⏳ STT 대기 중..."   버튼: 재생만 활성
  processing  → "🔄 변환 중 (최대 3분)"  버튼: 재생만 활성
  done        → "✅ STT 완료"          버튼: 재생 + 텍스트 보기
  failed      → "⚠️ {error_korean}"    버튼: 재생 + 재시도
```

### 5.3 텍스트 보기 모달
```
┌─────────────────── 📄 홍길동님 상담 ───────────────────┐
│  Gemini 2.5 Flash Lite  ·  2026-04-20 15:42 변환       │
│  ───────────────────────────────────────────────────   │
│  담당자: 안녕하세요. 오늘 상담 시작하겠습니다...         │
│  고객: 네, 지난번에 말씀드린 건 때문에...                │
│  ...                                                   │
│  ───────────────────────────────────────────────────   │
│                              [복사]  [닫기]             │
└────────────────────────────────────────────────────────┘
```

### 5.4 재생 모달
```
┌────────── 🎙️ 재생 ──────────┐
│ <iframe Drive preview>       │
│   (autoplay 금지)            │
│                              │
│ Fallback: 새 탭에서 열기       │
└──────────────────────────────┘
```

### 5.5 에러 메시지 매핑
| transcript_error | UI 표시 |
|---|---|
| `no_api_key` | "Gemini API 키가 등록되지 않았습니다. 프로필에서 등록 후 재시도하세요." |
| `file_too_large` | "20MB 초과 파일은 STT할 수 없습니다." |
| `rate_limited` | "일일/분당 호출 한도를 초과했습니다. 잠시 후 재시도하세요." |
| `invalid_audio` | "지원하지 않는 오디오 형식입니다." |
| `drive_fetch_failed` | "Drive 파일을 읽지 못했습니다. 공유 권한을 확인하세요." |
| 기타 | "STT에 실패했습니다. 재시도해주세요." |

### 5.6 업로드 폼 동의 문구 수정
기존 "고객의 녹음 동의를 받았음을 확인합니다." →
**"고객의 녹음 동의를 받았으며, 본 파일이 텍스트 변환을 위해 Google Gemini API로 전송됨에 동의합니다."**

---

## 6. Gemini STT 구현

### 6.1 `features/recordings/services/geminiStt.ts`
```ts
import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_STT_MODEL = 'gemini-2.5-flash-lite'
export const MAX_STT_BYTES = 20 * 1024 * 1024  // 20MB

const STT_PROMPT = `이 오디오는 한국어 보험 상담 녹음입니다.
1. 한국어로 정확히 받아쓰기 하세요.
2. 화자가 구분되면 "담당자:", "고객:" 으로 표시하세요.
3. 음성 배경잡음/헛기침은 생략합니다.
4. 보험 전문용어(예: 갱신형, 무해지환급형, 보장개시일)는 정확히 표기하세요.
5. 결과만 출력하세요. 설명 문구 금지.`

export async function transcribeAudio(
  audioBuffer: Buffer,
  apiKey: string,
  mimeType: string
): Promise<string> {
  if (audioBuffer.byteLength > MAX_STT_BYTES) {
    throw new SttError('file_too_large')
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_STT_MODEL })

  const result = await model.generateContent([
    { inlineData: { data: audioBuffer.toString('base64'), mimeType } },
    { text: STT_PROMPT },
  ])
  const text = result.response.text().trim()
  if (!text) throw new SttError('empty_result')
  return text
}

export class SttError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
  }
}
```

### 6.2 에러 매핑
- Gemini SDK `GoogleGenerativeAIError` status 429 → `SttError('rate_limited')`
- status 400 invalid_argument → `SttError('invalid_audio')`
- status 401/403 → `SttError('invalid_key')`

---

## 7. Security

| 항목 | 조치 |
|---|---|
| API 키 저장 | Supabase Vault (pgsodium XChaCha20-Poly1305) |
| API 키 조회 | `SECURITY DEFINER` RPC, `service_role`만 execute 권한 |
| 클라이언트 노출 | `/status` 엔드포인트는 boolean만 반환, 마스킹된 앞 4자리도 DB에 별도 저장 안 함 |
| Drive 파일 접근 | 서버가 업로더의 `google_refresh_token`으로 access token 재발급 |
| 인가 | transcribe POST: owner만 / GET: owner OR is_shared |
| 로그 | `transcript_error`에 민감 정보(키 등) 저장 금지, 매핑된 코드만 저장 |
| CSRF | Next.js Route Handler + SameSite cookie (기존) |

---

## 8. Test Plan

### 8.1 L1 — API Endpoint
- `POST /api/profile/gemini-key` with valid key → 200, `rpc set_user_gemini_key` 호출 확인
- 같은 엔드포인트 미인증 → 401
- `GET /api/profile/gemini-key/status` → `{ registered: true/false }` 올바르게 반환
- `POST /api/recordings/[id]/transcribe` 이미 processing 상태에서 → 409
- 다른 사용자가 해당 recording의 transcribe POST 시도 → 403
- 20MB 초과 파일 → 400 `file_too_large`
- Gemini 429 mock → 429 + `transcript_error='rate_limited'`
- GET transcribe: owner 또는 is_shared=true에서만 200

### 8.2 L2 — UI Action
- 프로필 페이지에서 키 입력 → 저장 → "등록됨" 표시
- 업로드 완료 직후 카드에 "⏳ STT 대기 중" → polling으로 "✅ STT 완료" 전환
- failed 카드의 "재시도" 클릭 → transcribe POST 발생
- 텍스트 보기 클릭 → 모달 열림, 전문 표시, [복사] 동작

### 8.3 L3 — E2E Scenario
- 키 등록 → 15MB mp3 업로드 → 3분 내 done 상태 → 텍스트 모달 원문 확인 → `is_shared=true` 전환 → 다른 계정 로그인 → 동일 카드 열람 시 STT 재호출 없음 (네트워크 탭 확인)

### 8.4 L5 — Security
- DB dump에서 `vault.secrets.secret` 컬럼이 암호문만 포함하는지 확인
- `get_user_gemini_key` 를 `authenticated` role로 직접 호출 시 권한 에러
- `transcript_error`에 API 키 평문 없는지 grep

---

## 9. Dependencies

```
pnpm add @google/generative-ai
```

- 추가 패키지 1개만 필요
- Supabase Vault는 이미 extension으로 활성화 가능 (별도 인프라 없음)
- Drive alt=media 스트리밍은 기존 `features/drive/services/driveClient.ts` 재사용 (없으면 추가)

---

## 10. Rollout

### 10.1 단계
1. DB 마이그레이션 적용 (Supabase dashboard에서 SQL 실행)
2. 서버 코드 배포 (vault RPC는 이미 DB에 있으므로 호출만 됨)
3. 기존 녹취록은 `transcript_status='pending'`으로 기본값 들어가나 자동 재처리 안 함 → 사용자가 카드의 "STT 실행" 버튼으로 수동 trigger (v2에서 일괄 백필)
4. 프로필 페이지 접근 가능 후 사용자에게 키 등록 안내

### 10.2 Feature Flag
- 별도 flag 없음. 키 미등록 = STT 비활성으로 자연스럽게 graceful degrade

---

## 11. Implementation Guide

### 11.1 파일 목록

**생성 (8개)**
| 파일 | 용도 |
|---|---|
| `supabase/migrations/2026xxxx_recording_stt.sql` | Vault + recordings 확장 |
| `src/features/auth/services/vaultService.ts` | Vault RPC 래퍼 |
| `src/features/recordings/services/geminiStt.ts` | Gemini STT 도메인 |
| `src/features/recordings/services/transcribeService.ts` | 전체 transcribe 오케스트레이션 |
| `src/app/api/profile/gemini-key/route.ts` | POST/DELETE 키 |
| `src/app/api/profile/gemini-key/status/route.ts` | GET 등록 여부 |
| `src/app/api/recordings/[id]/transcribe/route.ts` | POST 실행 + GET 조회 |
| `src/features/profile/components/GeminiKeyCard.tsx` | 프로필 UI |

**수정 (5개)**
| 파일 | 변경 |
|---|---|
| `src/types/database.types.ts` | RecordingsRow에 transcript 필드 4개 추가 |
| `src/app/api/recordings/route.ts` | 업로드 성공 후 fire-and-forget transcribe 호출 + 20MB 제한 |
| `src/features/library/components/RecordingPanel.tsx` | 상태 표시 + 텍스트 모달 + 재생 모달 |
| `src/features/library/hooks/useRecordings.ts` | polling 추가 (pending/processing일 때) |
| `src/app/(authed)/profile/page.tsx` | GeminiKeyCard 섹션 추가 |

예상 변경: **~850 라인 추가 / ~40 라인 수정**

### 11.2 구현 순서
1. DB 마이그레이션 작성·적용
2. `database.types.ts` 갱신
3. `vaultService.ts` (get/set/delete/status) — 유닛 테스트 포함
4. `geminiStt.ts` + 유닛 테스트 (mock Gemini)
5. `transcribeService.ts` (Drive fetch + Gemini 호출 + DB update 오케스트레이션)
6. `api/profile/gemini-key/*` 3개 route
7. `api/recordings/[id]/transcribe/route.ts` (POST + GET)
8. 업로드 route에 fire-and-forget 추가 + 20MB 제한
9. `GeminiKeyCard.tsx` + 프로필 페이지 통합
10. `RecordingPanel` 확장 (상태 badge, 텍스트 모달, 재생 모달)
11. `useRecordings` polling (5s interval, `pending`/`processing`만)
12. 동의 문구 수정
13. E2E 테스트 작성

### 11.3 Session Guide

**Module Map**
| 모듈 | 파일 | 의존 |
|---|---|---|
| `module-1-db` | 마이그레이션 SQL, types 업데이트 | — |
| `module-2-vault` | vaultService + `/api/profile/gemini-key*` | module-1 |
| `module-3-stt` | geminiStt + transcribeService + `/api/recordings/[id]/transcribe` | module-1, module-2 |
| `module-4-trigger` | 업로드 route 확장 + 20MB 제한 | module-3 |
| `module-5-ui-profile` | GeminiKeyCard + 프로필 섹션 | module-2 |
| `module-6-ui-panel` | RecordingPanel 확장 + polling + 모달 | module-3, module-4 |

**Recommended Session Plan (3 sessions)**
- **Session 1**: `module-1-db`, `module-2-vault`  → `/pdca do recording-stt --scope module-1-db,module-2-vault`
- **Session 2**: `module-3-stt`, `module-4-trigger`  → `/pdca do recording-stt --scope module-3-stt,module-4-trigger`
- **Session 3**: `module-5-ui-profile`, `module-6-ui-panel`  → `/pdca do recording-stt --scope module-5-ui-profile,module-6-ui-panel`

---

## 12. Open Items for Do Phase
- Drive refresh token으로 access token 재발급하는 유틸이 이미 있는지 확인 (없으면 `features/drive/services/driveClient.ts` 추가)
- `NEXT_PUBLIC_APP_URL` 환경변수 설정 여부 (fire-and-forget fetch에 필요)
- 프로필 페이지 라우트 실제 경로 확인 (`/profile` vs `/settings`)
