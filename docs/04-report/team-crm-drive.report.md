# team-crm-drive Completion Report

> **Status**: Complete (Static Verification) · Runtime QA & Production Deploy Pending
>
> **Project**: workspace (백지운 지점 팀 CRM)
> **Version**: v1.1 (team-crm 후속)
> **Author**: Ben Nam
> **Completion Date**: 2026-04-24
> **PDCA Cycle**: #2 (parent: team-crm v1.0)

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | team-crm-drive (Google Drive 녹음본 자동 업로드) |
| Start Date | 2026-04-23 |
| End Date | 2026-04-24 |
| Duration | 2일 (Plan → Design → Do Session 2/3 → Check) |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Static Match Rate: 94.4% ✅ (Green ≥90%)    │
├─────────────────────────────────────────────┤
│  ✅ Complete:      8 / 9 FR items           │
│  ⏳ Deferred:      1 / 9 FR items (P2)      │
│  ❌ Cancelled:     0 / 9 FR items           │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 수동 Drive 링크 복사·붙여넣기 (2단계, 누락 위험, 파일명 규칙 없음) |
| **Solution** | CRM 내 1클릭 파일 선택 → 서버 프록시(`/api/drive/upload`) → `백지운CRM/{고객}/` 자동 폴더 → `recordings` 자동 INSERT |
| **Function/UX Effect** | 업로드 진행률 0-100% 실시간 표시, 50MB 서버 재검증, 6종 에러 메시지 매핑, refresh_token NULL 시 재로그인 배너 자동 노출 |
| **Core Value** | 녹음본 소실 방지 + 고객별 자동 정리 + 팀장 청취 가능한 webViewLink 자동 연결 |

---

## 1.4 Success Criteria Final Status

> Plan §7에서 정의한 SC-1~SC-7 최종 평가.

| # | Criteria | Status | Evidence |
|---|---|:---:|---|
| SC-1 | refresh_token 서버 저장 + 재로그인 플로우 | ✅ Met | `api/auth/callback/route.ts:22-30`, `lib/google/tokenStore.ts`, `ReloginBanner.tsx` |
| SC-2 | ContactDetail → 파일 → Drive 업로드 | ✅ Met (Library 경로) | `api/drive/upload/route.ts`, `driveServer.uploadFile` (※ Library RecordingPanel 진입점, Plan Q SCOPE 변경 승인) |
| SC-3 | 업로드 성공 시 `recordings` 자동 INSERT | ✅ Met | `api/drive/upload/route.ts:64-79` (admin client RLS bypass) |
| SC-4 | 업로드 진행률 UI 0-100% | ✅ Met | `useUploadRecording.ts` XHR onprogress + `RecordingPanel` `role="progressbar"` |
| SC-5 | 50MB 초과 클라 차단 + 에러 | ✅ Met | `RecordingPanel` pre-check + `api/drive/upload:43-45` (413 `file_too_large`) |
| SC-6 | refresh_token 만료(401) → 재로그인 배너 | ✅ Met | `driveServer.getAccessToken` 401 캐치 → `clearRefreshToken` → `DriveAuthError('token_expired')` → `ReloginBanner` |
| SC-7 | Vercel 프로덕션 배포 후 E2E 업로드 성공 | ⏳ Pending | 빌드는 성공(Session 3 commit 59c954a). 프로덕션 배포/E2E는 /pdca qa에서 수행 |

**Success Rate**: 6/7 criteria met (85.7%) · SC-7은 배포 세션(next)로 이관

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|---|---|:---:|---|
| [Plan Q1] | 전원 재로그인 (clean break) | ✅ | `prompt=consent` + `drive.file` scope → 기존 세션 강제 재동의 |
| [Plan Q2] | 개인 Drive `/백지운CRM/{고객}/` | ✅ | `DRIVE_ROOT_FOLDER='백지운CRM'` + `ensureCustomerFolder` + `drive_folder_cache` |
| [Plan Q3] | 녹음 동의 UI 스킵 (사전 교육) | ❌ Intentional Deviation | RecordingPanel에 동의 체크박스 유지 — 안전장치. Minor 등급, 승인된 이탈 |
| [Plan Q4] | 녹음본만 (증권/약관 v1.2+) | ✅ | RecordingPanel에서 오디오만 accept="audio/*" |
| [Plan Q5] | 50MB 한도 | ✅ | `MAX_UPLOAD_BYTES = 50*1024*1024`, 클라+서버 이중 검증 |
| [Design] Option C 3-Layer | ✅ | Presentation(UI) / Application(hook) / Infra(driveServer) 경계 명확 |
| [Design] drive.file scope | ✅ | LoginForm + ReloginBanner 양쪽 동일 설정 |
| [Design] 서버 프록시 only | ✅ | 클라에서 `googleapis` import 없음, fetch/XHR만 사용 |

---

## 2. Related Documents

| Phase | Document | Status |
|---|---|---|
| Plan | [team-crm-drive.plan.md](../01-plan/features/team-crm-drive.plan.md) | ✅ Finalized |
| Design | [team-crm-drive.design.md](../02-design/features/team-crm-drive.design.md) | ✅ Finalized (Option C) |
| Check | [team-crm-drive.analysis.md](../03-analysis/team-crm-drive.analysis.md) | ✅ 94.4% (Static) |
| Act | Current document | 🔄 Writing |

---

## 3. Completed Items

### 3.1 Functional Requirements

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-D1 | Google OAuth `drive.file` scope + refresh_token 서버 저장 | ✅ | LoginForm + auth/callback |
| FR-D2 | `/api/drive/upload` 서버 프록시 (50MB) | ✅ | nodejs runtime, 6종 에러 매트릭스 |
| FR-D3 | Drive `/백지운CRM/{고객}/` 자동 폴더 (재사용) | ✅ | `drive_folder_cache` 캐시 |
| FR-D4 | `recordings` 자동 INSERT (drive_file_id + webViewLink) | ✅ | admin client (RLS bypass) |
| FR-D5 | RecordingPanel 파일 선택 + 진행률 UI | ✅ | XHR onprogress, role=progressbar |
| FR-D6 | refresh_token NULL 시 재로그인 배너 | ✅ | `ReloginBanner` + `/api/drive/has-refresh-token` |
| FR-D7 | access_token 만료(401) 자동 refresh | ✅ | `getAccessToken` 재시도 + clearRefreshToken |
| FR-D8 | Drive 쿼터 초과(403) friendly 메시지 | ✅ | 507 storageQuotaExceeded → errorMessage 매핑 |
| FR-D9 | ContactDetail 녹음본 서브탭 (P2) | ⏳ Deferred | v1.2 백로그. Library 단일 진입점으로 기능적 동등 |

### 3.2 Non-Functional Requirements

| 항목 | 목표 | 결과 | 상태 |
|---|---|---|:-:|
| 업로드 성능 | 50MB < 30초 | 빌드 완료, 런타임 측정은 QA에서 | ⏳ |
| 보안 (RLS) | refresh_token 본인만 접근 | admin client는 server-only 사용 | ✅ |
| 가용성 (재시도) | 3회 재시도 | 5xx에 대해 1s/3s/9s backoff | ✅ |
| 관측성 | 성공/실패 로그 | console.info/error + recordingId 포함 | ✅ |
| 호환성 | Chrome/Edge/Safari 최신 2 | XHR + FormData 표준 API | ✅ |

### 3.3 Deliverables

| Deliverable | Location | Status |
|---|---|:-:|
| DB Migration | `supabase/migrations/20260424_drive_integration.sql` | ✅ (실행은 대표님 액션) |
| Types | `src/types/drive.ts` | ✅ |
| Server Infra | `src/lib/google/{tokenStore,driveServer}.ts` | ✅ |
| API Routes | `src/app/api/drive/{upload,has-refresh-token}/route.ts` + `api/auth/callback/route.ts` | ✅ |
| UI Components | `RecordingPanel.tsx`, `ReloginBanner.tsx`, `LoginForm.tsx` | ✅ |
| Client Hook | `src/features/library/hooks/useUploadRecording.ts` | ✅ |
| E2E Tests | `tests/e2e/team-crm-drive.spec.ts` (L1/L2/L3) | ✅ (실행은 Playwright 설치 후 QA) |

---

## 4. Incomplete Items

### 4.1 Carried Over to Next Cycle

| Item | Reason | Priority | Estimated Effort |
|---|---|---|---|
| FR-D9 ContactDetail 녹음본 서브탭 | P2 Optional, Library로 기능 커버 | Low | 0.5일 (v1.2) |
| SC-7 Vercel 프로덕션 E2E | 런타임 검증 필요 | High | /pdca qa 세션 |
| Rate limit (분당 10건) | Design §7 언급, 개인 Drive scope로 리스크 낮음 | Low | v1.2 |
| Playwright 설치 + storageState | `pnpm add -D @playwright/test` + 테스트 계정 | Medium | QA 세션 prerequisite |

### 4.2 Cancelled/On Hold

| Item | Reason | Alternative |
|---|---|---|
| 증권 PDF / 약관 업로드 | v1.2 스코프 | 현재는 녹음본만 |
| Shared Drive 지원 | Plan 협의 스킵 | 개인 Drive + webViewLink 공유 |
| resumable upload (>100MB) | 50MB 한도로 불필요 | multipart |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | 비고 |
|---|---|---|---|
| Structural Match | 90% | 92% | FR-D9 Deferred 제외 100% |
| Functional Depth | 90% | 90% | 3 Minor gaps |
| API Contract | 90% | 100% | 12/12 필드 매치 |
| Overall (Static) | 90% | **94.4%** ✅ | Runtime은 QA 단계 |
| Critical Issues | 0 | 0 | ✅ |
| Important Issues | 0 | 0 | ✅ |
| Minor Issues | — | 3 | M1~M3 백로그 |

### 5.2 Resolved Issues (Build/Iterate)

| Issue | Resolution | Result |
|---|---|:-:|
| `@ts-expect-error` unused (upload/route.ts:87) | `(inserted as { id: string }).id` 캐스팅 | ✅ |
| `drive_folder_cache` Supabase 타입 미존재 | `createAdminSupabaseClient() as any` + eslint-disable | ✅ |
| tokenStore.ts `@ts-expect-error` unused | 전체 rewrite → `as any` 캐스팅 | ✅ |

---

## 6. Lessons Learned

### 6.1 What Went Well (Keep)

- **Option C 3-Layer 선택이 적중**: Presentation/Application/Infra 경계 덕분에 Session 2(서버)와 Session 3(UI)을 독립 커밋으로 분리 가능
- **Design §8 Test Plan을 Do 단계에서 미리 spec 파일로 작성**: Check 단계에서 재작성 없이 94.4% 평가 근거로 활용
- **서버 프록시 only 결정**: 클라이언트 번들에 `googleapis` 미포함 → refresh_token 노출 위험 원천 차단

### 6.2 What Needs Improvement (Problem)

- **Supabase 생성 타입(`database.types.ts`) 최신화 누락** → admin client 경로에서 `as any` 우회 발생. 마이그레이션 후 `supabase gen types typescript` 루틴화 필요
- **Playwright/storageState 준비가 QA 직전까지 미완료** → 정적 94.4%는 Green이지만 런타임 검증이 배포 직전 병목
- **Google Drive API 활성화 + OAuth redirect URL 확인이 수동 의존** → MCP 연결 후 자동화 가능

### 6.3 What to Try Next (Try)

- **Supabase/Vercel MCP 연동 후 재시도**: 마이그레이션 SQL 자동 실행 + 환경변수/배포 로그 조회를 PDCA 사이클 안에 편입
- **Design 단계에서 Rate limit/로그 마스킹을 명시적 In/Out Scope 처리**: "언급되었지만 구현 생략"이 아닌 결정으로 흔적화
- **동의 UI 같은 Plan 이탈은 Design Checkpoint에서 재확인 절차 추가**: Intentional Deviation도 문서에 미리 잠가두기

---

## 7. Process Improvement Suggestions

### 7.1 PDCA Process

| Phase | 현황 | 개선 제안 |
|---|---|---|
| Plan | Q1~Q5 결정 기록 완성도 높음 | SC-7(배포) 같은 외부 의존 항목을 별도 "Release Criteria"로 분리 |
| Design | 3 옵션 비교가 실제 구현 모듈 분리에 직결됨 | Session Guide가 효과적 — 유지 |
| Do | Session 2/3 독립 커밋 성공 | 빌드 에러 시 `@ts-expect-error` 대신 타입 생성 루틴 자동화 |
| Check | 정적 94.4%로 Green, 런타임은 QA로 분리 | Design §8의 테스트 spec을 Do에서 작성 → Check에서 실행(현재 런타임 deferred 이유는 Playwright 미설치) |

### 7.2 Tools/Environment

| Area | 제안 | 기대 효과 |
|---|---|---|
| Supabase MCP | 마이그레이션 자동 실행 + 타입 재생성 | DB 스키마 drift 방지 |
| Vercel MCP | 배포 상태/로그/환경변수 in-session 확인 | SC-7 같은 배포 의존 SC 자동 추적 |
| GitHub MCP (PAT) | PR 작성/리뷰/Action 상태 확인 | Session-to-commit 추적성 강화 |
| Playwright | `pnpm add -D @playwright/test` + storageState 준비 | L2/L3 자동 실행 → 100% Match Rate 가능 |

---

## 8. Next Steps

### 8.1 Immediate (SC-7 + QA)

- [ ] **대표님 액션 1**: Supabase SQL Editor에서 `20260424_drive_integration.sql` 실행
- [ ] **대표님 액션 2**: Google Cloud Console에서 Drive API 활성화 + OAuth redirect URL 확인
- [ ] **대표님 액션 3**: Vercel/Supabase MCP OAuth 완료 (`/mcp` → Authenticate)
- [ ] `pnpm add -D @playwright/test` + storageState.json 생성
- [ ] `/pdca qa team-crm-drive` → L1/L2/L3 런타임 검증
- [ ] Vercel 프로덕션 배포 → E2E 업로드 1건 성공 (SC-7 클로즈)
- [ ] 팀원 80명 대상 재로그인 공지

### 8.2 Next PDCA Cycle (v1.2)

| Item | Priority | Expected Start |
|---|---|---|
| 증권 PDF / 약관 업로드 확장 | High | 2026-05 |
| ContactDetail 녹음본 서브탭 (FR-D9) | Medium | 2026-05 |
| Rate limit (분당 10건) | Low | 2026-05+ |
| Drive 권한 자동 공유 (팀장 청취) | Medium | 2026-05 |

---

## 9. Changelog

### v1.1.0 (2026-04-24)

**Added:**
- Google Drive 자동 업로드 서버 프록시 (`/api/drive/upload`)
- 개인 Drive 고객별 폴더 자동 생성/재사용 (`ensureCustomerFolder` + `drive_folder_cache`)
- `recordings` 자동 INSERT (admin client RLS bypass)
- XHR 진행률 UI + 6종 에러 매트릭스
- `ReloginBanner` + `/api/drive/has-refresh-token` 감지
- Playwright L1/L2/L3 테스트 스펙

**Changed:**
- `LoginForm.tsx`: `drive.file` scope 추가, `prompt=consent`
- `RecordingPanel.tsx`: 수동 링크 입력 UI → 파일 업로드 + 진행률 (수동 등록은 fallback으로 유지)
- `users` 테이블: `google_refresh_token` 컬럼 추가

**Fixed:**
- `@ts-expect-error` 빌드 차단 3건 해소 (upload/route.ts, tokenStore.ts, driveServer.ts)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-24 | Completion report 초안 — Static 94.4% 기준 | Ben Nam |

---

## Commits (증빙)

| SHA | Subject |
|---|---|
| `568be97` | feat(team-crm-drive): Session 2 — DB/Infra/API 구현 (module-db,infra,api) |
| `59c954a` | feat(team-crm-drive): Session 3 — UI + tests (module-ui,module-tests) |
