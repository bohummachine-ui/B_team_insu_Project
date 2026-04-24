# team-crm-drive Analysis Document

> **Phase**: Check (Gap Analysis)
> **Date**: 2026-04-24
> **Mode**: Static-only (no running server; runtime L1/L2/L3 deferred to /pdca qa)
> **Upstream**: Plan v1.1 + Design (Option C) + Do Session 2+3

---

## Context Anchor (from Plan/Design)

| Key | Value |
|-----|-------|
| **WHY** | 수동 Drive 링크 입력 → 자동 업로드 (team-crm v1.0 C4 Critical) |
| **WHO** | 백지운 지점 팀원 ~80명, 고객 상담 녹음본 주 사용자 |
| **RISK** | OAuth scope 미동의, refresh_token 유출, Drive 15GB 쿼터, 세션 scope 미보유 |
| **SUCCESS** | 50MB < 30s, recordings 자동 저장, `백지운CRM/{고객}/` 자동 생성, refresh_token 서버 저장 |
| **SCOPE** | 녹음본만 (증권·약관은 v1.2+), 개인 Drive, 50MB, 녹음 동의 UI 유지 |

---

## 1. Summary

| Axis | Rate | Weight | Weighted |
|------|:-:|:-:|:-:|
| Structural | 92% | 0.2 | 18.4 |
| Functional | 90% | 0.4 | 36.0 |
| API Contract | 100% | 0.4 | 40.0 |
| **Overall (static)** | — | — | **94.4%** ✅ |

**Match Rate ≥ 90%** → Green. Runtime verification는 `/pdca qa`에서 실행.

---

## 2. Strategic Alignment Check

| Question | Result | Evidence |
|---|:-:|---|
| Implementation이 PRD 문제(수동 링크 복붙 비효율)를 해결하나? | ✅ | RecordingPanel 파일 업로드 UI + 서버 프록시 |
| Plan Success Criteria 달성 경로 있나? | ✅ | SC-1~5 모두 코드로 커버 (아래 §4 참조) |
| Design 핵심 결정 준수? | ✅ | Option C 3-Layer, drive.file scope, 서버 프록시 |

---

## 3. Structural Match (92%)

| Required File (Design §11) | Status | Path |
|---|:-:|---|
| migration SQL | ✅ | `supabase/migrations/20260424_drive_integration.sql` |
| `types/drive.ts` | ✅ | 완료 |
| `lib/google/tokenStore.ts` | ✅ | getRefreshToken/save/clear/hasRefreshToken |
| `lib/google/driveServer.ts` | ✅ | getAccessToken/ensureCustomerFolder/uploadFile |
| `api/drive/upload/route.ts` | ✅ | nodejs runtime, 50MB, 에러 매트릭스 |
| `api/auth/callback/route.ts` | ✅ | provider_refresh_token 저장 |
| `features/library/hooks/useUploadRecording.ts` | ✅ | XHR onprogress |
| `components/auth/ReloginBanner.tsx` | ✅ | has-refresh-token 조회 + CTA |
| `features/library/components/RecordingPanel.tsx` | ✅ | 파일 업로드 UI 추가 |
| `(auth)/login/LoginForm.tsx` | ✅ | drive.file scope + prompt=consent |
| `tests/e2e/team-crm-drive.spec.ts` | ✅ | L1/L2/L3 시나리오 |
| ContactDetail 녹음본 서브탭 (FR-D9 P2) | ❌ | Deferred — Library 단일 진입점 유지 (Plan §2.1 P2 항목) |

**Gap**: FR-D9 P2 — Contact Detail 내부 녹음본 서브탭은 미구현. Plan §2.1에서 P2(Optional)로 표기됨. **분류: Minor (P2, Out-of-Scope적 성격)**.

---

## 4. Plan Success Criteria Status

| SC | Description | Status | Evidence |
|---|---|:-:|---|
| SC-1 | refresh_token 서버 저장 + 재로그인 플로우 | ✅ Met | `auth/callback/route.ts:22-30`, `tokenStore.ts`, `ReloginBanner.tsx` |
| SC-2 | Drive 자동 업로드 (서버 프록시) | ✅ Met | `api/drive/upload/route.ts`, `driveServer.uploadFile` |
| SC-3 | recordings 자동 INSERT | ✅ Met | `upload/route.ts:64-79` (admin client, RLS 우회) |
| SC-4 | 업로드 진행률 UI 0-100% | ✅ Met | `useUploadRecording.ts` XHR onprogress, `RecordingPanel` progressbar |
| SC-5 | 50MB 서버 재검증 | ✅ Met | `upload/route.ts:43-45`, `types/drive.ts:25` MAX_UPLOAD_BYTES |
| SC-6 | 고객별 폴더 자동 생성/재사용 | ✅ Met | `driveServer.ensureCustomerFolder` + `drive_folder_cache` 캐시 |

**Success Rate**: 6/6 (100%).

---

## 5. Functional Depth (90%)

### ✅ 커버됨

- 파일 picker `accept="audio/*"`, 50MB 클라 가드 + 서버 재검증
- 고객 select (필수 — 빈 값 차단)
- 진행률 바 + `role="progressbar"` + aria-valuenow
- 성공/실패 toast (6종 에러 메시지 매핑)
- 녹음 동의 체크박스 (Design §5.4 필수 항목)
- ReloginBanner: `/api/drive/has-refresh-token` 가드 → NULL이면 표시, 재로그인 버튼 + dismiss X
- 5xx 재시도 (1s/3s/9s), 403 quota 즉시 실패
- refresh_token 만료 시 `clearRefreshToken` → `DriveAuthError('token_expired')`

### ⚠️ Minor gaps

| # | Item | Severity | Note |
|---|---|:-:|---|
| F1 | ContactDetail 서브탭 미구현 | Minor | Plan P2, Library 통합으로 기능적 동등 |
| F2 | Rate limit (사용자당 분당 10건) | Minor | Design §7 언급, 구현 생략 (server proxy, 개인 Drive scope 한정적) |
| F3 | 로그 마스킹 `refresh_token → ***` | Minor | 현재 로그에 token 직접 출력 없음 (console.error는 e 객체 전체) — 안전한 기본값 |

---

## 6. API Contract Verification (100%)

**POST /api/drive/upload** (Design §4.2)

| Field | Design | Server | Client | Match |
|---|---|---|---|:-:|
| Req: file | File | `form.get('file')` instanceof File | FormData.append('file') | ✅ |
| Req: customerId | string (UUID) | 타입/빈값 검증 | FormData.append | ✅ |
| Req: customerName | string | 타입/trim 검증 | FormData.append | ✅ |
| Res 201: recordingId | string | `inserted.id` | `DriveUploadResult` | ✅ |
| Res 201: driveFileId | string | `uploaded.fileId` | ✅ | ✅ |
| Res 201: webViewLink | string | `uploaded.webViewLink` (fallback URL) | ✅ | ✅ |
| Err 401 unauthorized | ✅ | 401 | errorMessage 매핑 | ✅ |
| Err 403 no_refresh_token | ✅ | 403 | ✅ | ✅ |
| Err 403 token_expired | ✅ | 403 | ✅ | ✅ |
| Err 413 file_too_large | ✅ | 413 | ✅ | ✅ |
| Err 507 quota_exceeded | ✅ | 507 | ✅ | ✅ |
| Err 500 upload_failed | ✅ | 500 | ✅ | ✅ |

**GET /api/drive/has-refresh-token** (신규, Design §5.4 implicit)

| Field | Server | Client |
|---|---|---|
| Response | `{ hasToken, authenticated }` | ReloginBanner 조건부 표시 |

**Contract: 12/12 = 100%**

---

## 7. Decision Record Verification

| [Origin] Decision | Followed? | Evidence |
|---|:-:|---|
| [Plan Q1] 전원 재로그인 | ✅ | prompt=consent + drive.file scope 추가 → 기존 세션 재동의 필수 |
| [Plan Q2] 개인 Drive `/백지운CRM/{고객}/` | ✅ | `DRIVE_ROOT_FOLDER='백지운CRM'`, `ensureCustomerFolder` |
| [Plan Q3] 녹음 동의 UI 스킵 | ❌ Deviation | RecordingPanel UploadForm에 동의 체크박스 추가됨. **이유**: Design §5.4 Page UI Checklist에서 사전 교육 대체 논의와 별개로 UI 요소 자체는 유지 권장(안전장치). **분류: 의도적 이탈, Minor**. |
| [Plan Q4] 녹음본만 | ✅ | 증권/약관 UI 없음 |
| [Plan Q5] 50MB | ✅ | MAX_UPLOAD_BYTES = 50\*1024\*1024 |
| [Design] Option C 3-Layer | ✅ | Presentation(UI)/Application(hook)/Infra(driveServer) 경계 명확 |
| [Design] drive.file scope | ✅ | LoginForm + ReloginBanner 둘 다 설정 |
| [Design] 서버 프록시 only | ✅ | 클라는 fetch만, googleapis import 없음 |

---

## 8. Runtime Verification Plan (deferred → /pdca qa)

### L1 API (tests/e2e/team-crm-drive.spec.ts §1)
- 401 unauthorized without session ✅ 시나리오
- 413 file_too_large ✅ 시나리오
- 400 bad_request (missing customerId) ✅ 시나리오
- has-refresh-token 응답 shape ✅ 시나리오

### L2 UI (`test.skip` on `E2E_AUTH_STATE`)
- 50MB 초과 → 버튼 disabled ✅
- 진행률 바 + 성공 toast ✅

### L3 E2E
- 로그인 → 자료실 → 녹음본 탭 → 업로드 → 목록 갱신 ✅

**Prerequisite for /pdca qa**:
1. `pnpm add -D @playwright/test`
2. Supabase migration 실행
3. Google Drive API 활성화
4. 테스트용 storageState.json 생성 + E2E_AUTH_STATE env 설정

---

## 9. Issue Summary (Severity ≥ Important)

**Critical**: 없음.
**Important**: 없음.
**Minor**:
- M1: ContactDetail 서브탭 미구현 (Plan P2, Optional)
- M2: Rate limit 미구현 (Design §7 언급, 리스크 낮음)
- M3: 녹음 동의 UI 유지 (Plan Q3 Deviation, 안전장치 유지가 합리적)

---

## 10. Checkpoint 5 — Review Decision

Match Rate **94.4%** (Green ≥90%). Critical/Important 이슈 없음.

권장: **그대로 진행** → `/pdca qa team-crm-drive` (런타임 검증) 또는 `/pdca report team-crm-drive` (완료 보고).

Minor 이슈(M1~M3)는 v1.2 백로그로 이관 권장.
