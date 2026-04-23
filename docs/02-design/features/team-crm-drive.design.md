# team-crm-drive Design Document

> **Summary**: Google Drive `drive.file` scope 기반 서버 프록시 녹음본 업로드 — Pragmatic Balance 아키텍처
>
> **Project**: 백지운 지점 팀 CRM — Drive 연동
> **Version**: v1.1
> **Author**: Ben Nam
> **Date**: 2026-04-23
> **Status**: Draft
> **Planning Doc**: [team-crm-drive.plan.md](../../01-plan/features/team-crm-drive.plan.md)
> **Selected Architecture**: **Option C — Pragmatic Balance**

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | team-crm v1.0 C4 Critical — 수동 Drive 링크 입력 → 실사용 저해, 녹음본 누락 위험 |
| **WHO** | 팀원 ~80명 (각자 개인 Google Drive), 고객별 상담 녹음본 업로드 주 사용자 |
| **RISK** | (1) `drive.file` scope 동의 실패, (2) refresh_token 유출, (3) 15GB 쿼터 초과, (4) 기존 세션 scope 부재 → 재로그인 유도 |
| **SUCCESS** | 업로드 < 30초(50MB), drive_file_id 자동 저장, `/백지운CRM/{고객이름}/` 자동 생성, access_token 자동 갱신 |
| **SCOPE** | 녹음본 업로드만, 50MB 한도, 개인 Drive, 녹음 동의 UI 생략 |

---

## 1. Overview

### 1.1 Design Goals

- 팀원이 CRM 내에서 1클릭으로 녹음본을 Drive에 업로드 + `recordings` 자동 연결
- 서버 프록시 구조로 `drive.file` scope 준수 (앱이 생성한 파일만 접근)
- 3레이어 자연 분리 (Infra/Application/Presentation) — 과설계 없이 테스트 가능

### 1.2 Design Principles

- **서버 프록시 only**: 클라이언트는 access_token을 직접 보유하지 않음 (보안)
- **단일 책임 파일**: `driveServer.ts`(Drive 호출), `tokenStore.ts`(Supabase 토큰 CRUD)
- **재사용 여지**: `ensureFolder / uploadFile`은 v1.2 증권/약관 확장 시 재활용
- **Fail loud**: refresh_token 만료/쿼터 초과는 사용자에게 명확한 메시지

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | **Option C: Pragmatic** |
|----------|:-:|:-:|:-:|
| New Files | 3 | 9 | **5** |
| Modified Files | 3 | 5 | **4** |
| Complexity | Low | High | **Medium** |
| Maintainability | Medium | High | **High** |
| Effort | Low | High | **Medium** |
| v1.2 Extensibility | 리팩터 필요 | 즉시 | **소폭 수정** |
| **Recommendation** | 핫픽스 | 장기 프로젝트 | **이 규모 기본값** ⭐ |

**Selected**: **Option C — Pragmatic Balance**

**Rationale**:
1. team-crm v1.0이 `lib/google/driveClient.ts` 스텁을 이미 가지고 있어 `driveServer.ts` 추가가 자연스러움
2. 녹음본 단일 기능에 Option B는 과설계, Option A는 테스트 어려움
3. v1.2 증권/약관 확장 시 `ensureFolder/uploadFile` 재사용 가능

### 2.1 Component Diagram

```
┌──────────────────┐    1. file select    ┌───────────────────┐
│  RecordingPanel  │─────────────────────▶│ useUploadRecording│
│  (Presentation)  │◀──── progress ───────│   (Application)   │
└──────────────────┘                      └─────────┬─────────┘
                                                    │ fetch POST
                                                    ▼
                             ┌──────────────────────────────────┐
                             │   /api/drive/upload (route.ts)   │
                             │   - auth guard                   │
                             │   - 50MB 검증                    │
                             └──┬─────────────────┬─────────────┘
                                │                 │
                                ▼                 ▼
                   ┌──────────────────┐   ┌──────────────────┐
                   │  tokenStore.ts   │   │  driveServer.ts  │
                   │  (Infra/Supabase)│   │  (Infra/googleapis)
                   └────────┬─────────┘   └─────────┬────────┘
                            │                       │
                            ▼                       ▼
                   ┌──────────────────┐   ┌──────────────────┐
                   │   Supabase DB    │   │  Google Drive API│
                   │ (users.google_*) │   │  (drive.file)    │
                   └──────────────────┘   └──────────────────┘
```

### 2.2 Data Flow

```
Browser                  Next.js Server              Google
─────                    ──────────────              ──────
1. file pick
2. POST /api/drive/upload (multipart)
                         3. auth check (401)
                         4. size check (413)
                         5. tokenStore.get(userId)
                         6. refreshAccessToken(refresh_token)────▶ oauth2/token
                                                          ◀────── access_token
                         7. ensureFolder(accessToken, 고객이름)──▶ files.create(folder)
                                                          ◀────── folderId
                         8. uploadFile(accessToken, folderId)───▶ files.create(multipart)
                                                          ◀────── fileId, webViewLink
                         9. INSERT recordings(..)
10. {recordingId, webViewLink} ◀──
11. toast + list refresh
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| RecordingPanel | useUploadRecording | File picker + progress UI |
| useUploadRecording | fetch `/api/drive/upload` | XHR mutation + onprogress |
| /api/drive/upload | tokenStore, driveServer, supabase.auth | Orchestrate |
| driveServer | googleapis | Drive API calls |
| tokenStore | supabase-js | users 테이블 CRUD |
| /api/auth/callback | tokenStore | provider_refresh_token 저장 |
| ReloginBanner | tokenStore (client SSR hint) | NULL token 감지 |

---

## 3. Data Model

### 3.1 DB Migration

```sql
-- supabase/migrations/20260424_drive_integration.sql

-- 1. users 테이블에 Drive refresh_token 컬럼
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token text;
COMMENT ON COLUMN users.google_refresh_token IS
  'Google OAuth refresh_token for Drive API. Encrypted at rest by Supabase.';

-- 2. RLS: 본인만 read/update
CREATE POLICY "users_own_token_select" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_token_update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. recordings 테이블 컬럼 확인/보강
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS drive_web_view_link text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz DEFAULT now();

-- 4. drive_folder_cache (선택) — 고객별 folderId 캐시
CREATE TABLE IF NOT EXISTS drive_folder_cache (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  folder_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, customer_name)
);
ALTER TABLE drive_folder_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cache_own" ON drive_folder_cache
  FOR ALL USING (auth.uid() = user_id);
```

### 3.2 Entity Types

```typescript
// src/types/drive.ts
export interface DriveUploadResult {
  recordingId: string
  driveFileId: string
  webViewLink: string
  fileName: string
  sizeBytes: number
}

export interface DriveUploadError {
  code:
    | 'unauthorized'           // 401 세션 없음
    | 'no_refresh_token'       // 재로그인 필요
    | 'file_too_large'         // 50MB 초과
    | 'quota_exceeded'         // Drive 15GB 초과
    | 'token_expired'          // refresh_token 만료
    | 'upload_failed'          // 일반 업로드 실패
  message: string
}
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/drive/upload` | 녹음본 업로드 (multipart) | Required |
| GET | `/api/auth/callback` | OAuth callback + refresh_token 저장 | Supabase |

### 4.2 `POST /api/drive/upload`

**Request** (multipart/form-data):
```
file: File (<=50MB, audio/* 권장)
customerId: string (UUID)
customerName: string (폴더명용)
```

**Response 201 Created**:
```json
{
  "recordingId": "uuid",
  "driveFileId": "1ABC...",
  "webViewLink": "https://drive.google.com/file/d/1ABC.../view",
  "fileName": "2026-04-23_홍길동.mp3",
  "sizeBytes": 5242880
}
```

**Error Responses**:

| Status | Code | 원인 | 클라 처리 |
|:-:|---|---|---|
| 401 | `unauthorized` | 세션 없음 | 로그인 페이지 |
| 403 | `no_refresh_token` | users.google_refresh_token NULL | ReloginBanner 표시 |
| 403 | `token_expired` | refresh_token 무효 | token NULL 처리 + 재로그인 유도 |
| 413 | `file_too_large` | 50MB 초과 | "50MB 이하 파일만 가능" toast |
| 507 | `quota_exceeded` | Drive 15GB 초과 | "Drive 용량 부족" toast + Google One 링크 |
| 500 | `upload_failed` | 기타 | "업로드 실패, 다시 시도" toast |

### 4.3 `/api/auth/callback` (수정)

Supabase 기본 callback 뒤에 **provider_refresh_token 추출 후 users 테이블 upsert** 추가.

```typescript
// pseudocode
const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)
const providerRefreshToken = session.provider_refresh_token
if (providerRefreshToken) {
  await supabase.from('users').update({
    google_refresh_token: providerRefreshToken
  }).eq('id', session.user.id)
}
```

---

## 5. UI/UX Design

### 5.1 RecordingPanel 변경

**기존** (수동 링크):
```
[Drive 링크 input] [저장 버튼]   ⚠️ 주의 배너
```

**변경 후**:
```
┌─────────────────────────────────────────────────┐
│ 📁 녹음본 업로드                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │  [파일 선택] 2026-04-23_통화.mp3 (5.2 MB)   │ │
│ │  [  업로드 버튼  ]                          │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  45% (2.3/5.2 MB)              │
│                                                 │
│ 🎙 업로드 목록 (3건)                             │
│  ▸ 2026-04-23_통화.mp3  [Drive ↗]  [삭제 v1.2]  │
│  ▸ 2026-04-20_초담.mp3  [Drive ↗]                │
└─────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Contact Detail → "파일·증권" 탭 → "녹음본" 서브탭
  → 파일 선택 → (50MB 체크) → 업로드 클릭
  → 진행률 0-100% → 성공 toast → 목록 자동 갱신
  │
  └ (실패: no_refresh_token) → ReloginBanner 페이지 상단
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| RecordingPanel | `src/features/library/components/` | 파일 선택 + 진행률 + 목록 |
| ReloginBanner | `src/components/auth/` | NULL token 감지 + 재로그인 CTA |
| useUploadRecording | `src/features/library/hooks/` | TanStack mutation + XHR progress |

### 5.4 Page UI Checklist

#### RecordingPanel (녹음본 서브탭)

- [ ] Input: file picker (`accept="audio/*"`, `<=50MB` 클라이언트 검증)
- [ ] Display: 선택 파일명 + 크기 (MB)
- [ ] Button: "업로드" (파일 선택 후 활성화, 업로드 중 disabled)
- [ ] Progress: 진행률 바 (0-100%) + 전송/전체 MB 텍스트
- [ ] Toast: 성공 "업로드 완료: {fileName}"
- [ ] Toast: 실패 사유별 메시지 (6종)
- [ ] List: 업로드된 녹음본 (최신순) — fileName, uploaded_at, Drive 링크 버튼
- [ ] Empty state: "아직 업로드된 녹음본이 없습니다"

#### ReloginBanner

- [ ] Condition: `users.google_refresh_token IS NULL` (Drive 기능 접근 시)
- [ ] Message: "Drive 업로드 기능 사용을 위해 Google 재로그인이 필요합니다"
- [ ] Button: "Google로 다시 로그인" → `supabase.auth.signInWithOAuth({ scopes: 'drive.file' })`
- [ ] Dismiss: 페이지 세션 내 X 버튼

---

## 6. Error Handling

### 6.1 Error Code Matrix

| Code | HTTP | User Message (ko) | Action |
|---|:-:|---|---|
| unauthorized | 401 | "로그인이 만료되었습니다" | 로그인 페이지 redirect |
| no_refresh_token | 403 | "Drive 기능을 위해 Google 재로그인이 필요합니다" | ReloginBanner + CTA |
| token_expired | 403 | "인증이 만료되어 재로그인 필요" | token NULL 처리 + Banner |
| file_too_large | 413 | "50MB 이하의 파일만 업로드 가능합니다" | 파일 재선택 유도 |
| quota_exceeded | 507 | "Drive 저장 공간이 부족합니다" | Google One 링크 |
| upload_failed | 500 | "업로드에 실패했습니다. 다시 시도해주세요" | 재시도 버튼 |

### 6.2 Retry Strategy

- 서버에서 Drive API 5xx 응답 시 exponential backoff (1s, 3s, 9s) — 최대 3회
- 클라이언트에서는 별도 재시도 없음 (사용자 수동)

---

## 7. Security Considerations

- [x] `google_refresh_token` — Supabase 컬럼 저장 (at-rest encrypted), RLS 본인만
- [x] access_token — 서버 메모리만, 응답에 포함 X
- [x] 로그 마스킹 — refresh_token은 로그에 `***` 처리
- [x] 서버 프록시 only — 클라가 직접 Drive API 호출 X
- [x] `drive.file` scope — 앱이 생성한 파일만 접근 (최소 권한)
- [x] 파일 크기 서버 재검증 (클라 우회 방어)
- [x] MIME type 검증 (audio/* 권장, 타 타입도 허용하되 경고)
- [x] HTTPS 강제 (Vercel 기본)
- [x] Rate limit: 사용자당 분당 10건 업로드 제한

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1 API | `/api/drive/upload`, `/api/auth/callback` | curl/Playwright req | Do |
| L2 UI | RecordingPanel 상호작용 | Playwright | Do |
| L3 E2E | 로그인 → 업로드 → Drive 확인 | Playwright | Do |

### 8.2 L1 API Test Scenarios

| # | Endpoint | Test | Expected |
|---|---|---|:-:|
| 1 | POST /api/drive/upload (no session) | 401 unauthorized | 401 |
| 2 | POST 50MB 초과 file | 413 file_too_large | 413 |
| 3 | POST without customerId | 400 validation | 400 |
| 4 | POST with valid file + token | 201 + recordingId | 201 |
| 5 | POST after token NULL | 403 no_refresh_token | 403 |
| 6 | GET /api/auth/callback with provider_refresh_token | users.google_refresh_token 저장 확인 | — |

### 8.3 L2 UI Test Scenarios

| # | Action | Expected |
|---|---|---|
| 1 | RecordingPanel 로드 | 파일 선택 input + 빈 목록 표시 |
| 2 | 50MB 초과 파일 선택 | 클라 경고 toast, 업로드 버튼 비활성 |
| 3 | 유효 파일 선택 + 업로드 클릭 | 진행률 0→100%, 성공 toast, 목록 추가 |
| 4 | token NULL 상태 진입 | ReloginBanner 표시 |
| 5 | ReloginBanner "재로그인" 클릭 | Google OAuth 동의 화면 |

### 8.4 L3 E2E Scenarios

| # | Scenario | Steps | Success |
|---|---|---|---|
| 1 | 전체 업로드 플로우 | 로그인 → Contact → 녹음본 탭 → 파일 선택 → 업로드 | Drive에 `/백지운CRM/홍길동/2026-04-23_*.mp3` 존재, recordings 테이블에 row |
| 2 | 재로그인 플로우 | 기존 세션(scope 없음) → Banner → 재로그인 → Drive 업로드 성공 | google_refresh_token 저장됨 |
| 3 | 쿼터 초과 | (모의) 507 응답 | 친화적 메시지 toast |

### 8.5 Seed Data Requirements

| Entity | Min | Key Fields |
|---|:-:|---|
| users | 1 | google_refresh_token NOT NULL (수동 세팅) |
| contacts | 1 | name="테스트고객", user_id=테스트유저 |
| test audio | 1 | ~5MB mp3 (`tests/fixtures/sample.mp3`) |

---

## 9. Clean Architecture

### 9.1 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| RecordingPanel, ReloginBanner | Presentation | `src/features/library/components/`, `src/components/auth/` |
| useUploadRecording | Application | `src/features/library/hooks/` |
| `/api/drive/upload/route.ts` | Application (controller) | `src/app/api/drive/upload/` |
| DriveUploadResult types | Domain | `src/types/drive.ts` |
| driveServer, tokenStore | Infrastructure | `src/lib/google/` |

### 9.2 Import Rules

- `RecordingPanel` imports `useUploadRecording` (OK: Presentation → Application)
- `useUploadRecording` fetches `/api/drive/upload` (OK: no direct Infra import client-side)
- `route.ts` imports `driveServer + tokenStore` (OK: controller → Infra)
- `driveServer` imports `googleapis` only (Infra, no business logic leak)

---

## 10. Coding Convention Reference

### 10.1 File Naming

| Target | Rule | Example |
|---|---|---|
| Components | PascalCase.tsx | `RecordingPanel.tsx`, `ReloginBanner.tsx` |
| Hooks | useCamelCase.ts | `useUploadRecording.ts` |
| Lib modules | camelCase.ts | `driveServer.ts`, `tokenStore.ts` |
| Types | camelCase.ts | `drive.ts` |

### 10.2 Environment Variables

| Name | Scope | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Server | OAuth client (이미 존재) |
| `GOOGLE_CLIENT_SECRET` | Server | OAuth client (이미 존재) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | (기존) |

### 10.3 Design Ref Comments

- `route.ts`: `// Design Ref: §4.2 /api/drive/upload — 서버 프록시 multipart`
- `driveServer.ts`: `// Design Ref: §2.2 Data Flow step 6-8`
- `tokenStore.ts`: `// Design Ref: §7 refresh_token server-only`
- `useUploadRecording.ts`: `// Plan SC-4: 진행률 UI 0-100%`

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/
│   └── drive.ts                                     [NEW]
├── lib/google/
│   ├── driveServer.ts                               [NEW]  googleapis + folder + upload
│   ├── tokenStore.ts                                [NEW]  users.google_refresh_token CRUD
│   └── driveClient.ts                               [KEEP] (v1.0 stub 재활용)
├── features/library/
│   ├── hooks/
│   │   └── useUploadRecording.ts                    [NEW]  TanStack mutation + XHR progress
│   └── components/
│       └── RecordingPanel.tsx                       [MOD]  수동 → file picker 교체
├── components/auth/
│   └── ReloginBanner.tsx                            [NEW]  NULL token 배너
├── app/api/
│   ├── drive/upload/route.ts                        [MOD]  stub 501 → 실구현
│   └── auth/callback/route.ts                       [MOD]  provider_refresh_token 저장
└── supabase/migrations/
    └── 20260424_drive_integration.sql               [NEW]  users + recordings + cache
```

**신규 5 / 수정 4**

### 11.2 Implementation Order

1. [ ] DB 마이그레이션 SQL 작성 + Supabase 적용
2. [ ] `pnpm add googleapis`
3. [ ] `src/types/drive.ts` 타입 정의
4. [ ] `src/lib/google/tokenStore.ts` (Supabase CRUD)
5. [ ] `src/lib/google/driveServer.ts` (getAccessToken / ensureFolder / uploadFile)
6. [ ] `/api/auth/callback/route.ts` 수정 (provider_refresh_token 저장)
7. [ ] `/api/drive/upload/route.ts` 실구현 (stub 교체)
8. [ ] `src/features/library/hooks/useUploadRecording.ts` (XHR + onprogress)
9. [ ] `src/components/auth/ReloginBanner.tsx`
10. [ ] `src/features/library/components/RecordingPanel.tsx` 교체
11. [ ] L1/L2/L3 테스트 시나리오 작성 (Do phase 마지막)
12. [ ] Supabase signInWithOAuth scope 추가 (`drive.file`)
13. [ ] 로컬 빌드 + dev 재로그인 테스트
14. [ ] Vercel 배포 → production 업로드 1건 성공 확인

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---:|
| DB + Types | `module-db` | migration SQL, `types/drive.ts` | 5 |
| Infra | `module-infra` | `tokenStore.ts`, `driveServer.ts`, googleapis 설치 | 10 |
| API | `module-api` | `/api/drive/upload` 실구현, `/api/auth/callback` 수정 | 10 |
| UI | `module-ui` | hook, RecordingPanel, ReloginBanner, OAuth scope | 15 |
| Tests | `module-tests` | L1/L2/L3 테스트 시나리오 (ANALYZE/QA에서 실행) | 5 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---|---|---|:-:|
| 1 (done) | Plan + Design | 전체 | 30 |
| 2 | Do | `--scope module-db,module-infra,module-api` | 30 |
| 3 | Do | `--scope module-ui,module-tests` | 25 |
| 4 | Check + QA + Report | 전체 | 30 |

**총 예상**: 3-4 세션 (기존 Plan 추정 4-5에서 단축 가능)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial draft, Option C selected | Ben Nam |
