# team-crm-drive Planning Document

> **Summary**: team-crm v1.0에서 descope된 Google Drive 녹음본 업로드 기능을 v1.1로 구현
>
> **Project**: 백지운 지점 팀 CRM — Drive 연동
> **Version**: v1.1 (team-crm feature 후속)
> **Author**: Ben Nam
> **Date**: 2026-04-23
> **Status**: Plan (Checkpoint 1+2 완료)
> **Parent Feature**: team-crm (Match Rate 91.4%, Green)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 `recordings` 테이블은 존재하나 `drive_file_id` 수동 입력만 지원 → 팀원들이 Drive에 직접 업로드 후 링크 복사·붙여넣기 하는 2단계 비효율, 누락 위험, 파일 이름 규칙 없음 |
| **Solution** | CRM에서 파일 선택 즉시 서버 프록시(`/api/drive/upload`)로 전송 → googleapis로 사용자 개인 Drive `/백지운CRM/{고객이름}/` 폴더에 자동 업로드 → `recordings` 테이블에 메타 저장 |
| **Function/UX Effect** | ContactDetail 녹음본 업로드 버튼 1클릭, 진행률 표시, 성공 시 Drive webViewLink 자동 연결 — 상담 직후 30초 내 아카이빙 |
| **Core Value** | 녹음본 소실 방지 + 고객별 자동 정리 + 팀장은 링크로 즉시 청취 가능 (권한 공유 시) |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | team-crm v1.0 Analysis에서 C4 Critical Gap — 수동 Drive 링크 입력은 실사용 저해, 녹음본 아카이빙 누락 위험 |
| **WHO** | 팀원 ~80명 (각자 개인 Google Drive 사용), 고객별 상담 녹음본 업로드 주 사용자 |
| **RISK** | (1) Google OAuth `drive.file` scope 동의 실패 시 업로드 불가, (2) refresh_token 유출 시 사용자 Drive 침해, (3) Drive 15GB 쿼터 도달, (4) 기존 로그인 세션 scope 미보유 → 재로그인 유도 필요 |
| **SUCCESS** | (1) 녹음본 파일 선택 → 업로드 완료 < 30초 (50MB 기준), (2) 업로드 성공 시 `recordings` 테이블에 drive_file_id 자동 저장, (3) Drive 폴더 `백지운CRM/{고객이름}/` 자동 생성 및 재사용, (4) refresh_token 서버 저장 후 access_token 자동 갱신 |
| **SCOPE** | Drive 녹음본 업로드만 (증권/약관/기타 첨부는 v1.2+ 연기). 최대 50MB. 개인 Drive 저장. 녹음 동의 UI 생략(사전 교육으로 대체) |

---

## 1. Overview

### 1.1 Purpose

team-crm v1.0에서 descope된 C4 Google Drive 연동을 완성하여, 팀원이 CRM 내에서 1클릭으로 고객 상담 녹음본을 Drive에 업로드하고 자동으로 `recordings` 테이블과 연결되도록 한다.

### 1.2 Background

team-crm v1.0 Analysis (docs/03-analysis/team-crm.analysis.md, 2026-04-23, Match Rate 91.4%):
- C4 Critical: `/api/drive/upload` stub 501 + `src/lib/google/driveClient.ts` 클라이언트 스텁만 존재
- `recordings` 테이블(drive_file_id 컬럼)은 DB 스키마에 존재하나 수동 입력만 지원
- `RecordingPanel.tsx`에 수동 링크 입력 UI + 경고 배너

### 1.3 Related Documents

- Parent Plan: `team-crm.plan.md`
- Parent Design: `team-crm.design.md` §4 (`/api/drive/upload` 계약)
- Parent Analysis: `team-crm.analysis.md` v0.2 (C4 항목)

### 1.4 결정 기록 (Checkpoint 2 답변)

| Q | 결정 | 근거 |
|---|---|---|
| Q1. 재로그인 전략 | **전원 재로그인** | 1회 clean break, scope 일관성 |
| Q2. 파일 저장 위치 | **개인 Drive `/백지운CRM/{고객이름}/`** | 팀원 소유권, Shared Drive 유료 플랜 불필요 |
| Q3. 녹음 동의 | **스킵 (사전 교육)** | 대표님이 팀원 온보딩 시 안내 |
| Q4. 업로드 범위 | **녹음본만** | 최소 범위로 빠른 안정화, 증권/약관은 v1.2 |
| Q5. 파일 크기 | **50MB** | multipart 단순, 10분 통화 mp3 ≈ 5-10MB 충분 |

---

## 2. Scope

### 2.1 In Scope (v1.1)

**OAuth 확장**
- [ ] Supabase `signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/drive.file' }})`
- [ ] `/api/auth/callback`에서 `provider_refresh_token` 추출 → `users.google_refresh_token` 저장
- [ ] 기존 사용자 재로그인 유도 배너 (로그인 후 `google_refresh_token` NULL 체크)

**DB 마이그레이션**
- [ ] `users.google_refresh_token text` 컬럼 추가 (encrypted at rest via Supabase)
- [ ] RLS: 본인만 select/update 가능
- [ ] `recordings` 테이블 컬럼 확인/보강: `drive_file_id`, `drive_web_view_link`, `file_name`, `mime_type`, `size_bytes`, `uploaded_at`

**서버 (Node)**
- [ ] `src/lib/google/driveServer.ts`:
  - `getAccessToken(userId)` — refresh_token으로 갱신
  - `ensureCustomerFolder(accessToken, customerName)` — `백지운CRM/{고객이름}/` 자동 생성 + 캐시
  - `uploadFile(accessToken, folderId, file, metadata)` — multipart 업로드
- [ ] `/api/drive/upload` 실구현:
  - formData → Buffer (50MB 제한 검증)
  - getAccessToken → ensureCustomerFolder → uploadFile
  - `recordings` INSERT (customer_id, user_id, drive_file_id, drive_web_view_link, ...)
  - 응답: `{ recordingId, driveFileId, webViewLink }`

**클라이언트**
- [ ] `src/features/library/components/RecordingPanel.tsx` 교체:
  - 수동 링크 입력 → 파일 선택 input + 업로드 버튼
  - 진행률 표시 (`XMLHttpRequest.upload.onprogress` 또는 fetch + ReadableStream)
  - 성공 시 toast + 자동 목록 갱신
- [ ] `ContactDetail` "파일·증권" 탭 → "녹음본" 서브탭 추가 (v1.1 안내 교체)

**에러 & 엣지**
- [ ] `google_refresh_token` NULL → "Google 재로그인 필요" 배너 + `signInWithOAuth` 버튼
- [ ] 50MB 초과 → 클라이언트 사전 차단
- [ ] refresh_token 만료(401) → NULL 처리 + 재로그인 유도
- [ ] Drive 쿼터 초과(403 storageQuotaExceeded) → 사용자 안내 toast

### 2.2 Out of Scope (v1.2+)

- 증권 PDF / 약관 / 기타 첨부 업로드
- Shared Drive 지원
- resumable upload (>100MB 파일)
- 업로드된 파일 삭제/재명명 UI
- 녹음본 Drive 권한 자동 공유 (팀장 청취)
- 녹음 동의 체크박스 UI

---

## 3. Functional Requirements

| ID | Priority | Description | 담당 |
|----|:---:|---|---|
| FR-D1 | P0 | Google OAuth scope `drive.file` 추가 + refresh_token 서버 저장 | Ben |
| FR-D2 | P0 | `/api/drive/upload` 서버 프록시 multipart 업로드 (50MB 제한) | Ben |
| FR-D3 | P0 | Drive에 `/백지운CRM/{고객이름}/` 폴더 자동 생성 (동명 재사용) | Ben |
| FR-D4 | P0 | `recordings` 테이블에 drive_file_id + webViewLink 자동 저장 | Ben |
| FR-D5 | P0 | `RecordingPanel.tsx` 파일 선택 + 진행률 표시 UI | Ben |
| FR-D6 | P1 | `google_refresh_token` NULL 시 재로그인 배너 | Ben |
| FR-D7 | P1 | access_token 만료(401) 자동 refresh | Ben |
| FR-D8 | P1 | Drive 쿼터 초과 시 사용자 친화적 에러 메시지 | Ben |
| FR-D9 | P2 | `ContactDetail` 파일·증권 탭을 녹음본 리스트로 교체 | Ben |

---

## 4. Non-Functional Requirements

| 항목 | 목표 |
|---|---|
| **업로드 성능** | 50MB 파일 < 30초 (home broadband 50Mbps 기준) |
| **보안** | `google_refresh_token` Supabase RLS 본인만 접근, 서버에서만 access_token 교환 |
| **가용성** | Drive API 일시 장애 시 3회 재시도 후 에러 반환 |
| **관측성** | 업로드 성공/실패 로그 (console.info/error), recordingId 포함 |
| **호환성** | Chrome, Edge, Safari 최신 2버전 |

---

## 5. Dependencies

| 항목 | 상태 |
|---|:---:|
| Google Cloud Console OAuth client | ✅ 완료 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` .env.local | ✅ 완료 |
| Drive API 활성화 | ⚠️ 확인 필요 (Console에서) |
| OAuth 승인된 리디렉션 URL (`/api/auth/callback`) | ⚠️ 확인 필요 |
| `googleapis` npm 패키지 설치 | ❌ 미설치 (`pnpm add googleapis`) |

---

## 6. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| 기존 80명 재로그인 거부/지연 | 중 | 중 | 대표님 공지로 일괄 안내, 로그인 시 배너 유도 |
| refresh_token 유출 | 저 | 높 | Supabase RLS + server-only 읽기, 로그에 마스킹 |
| Drive 15GB 쿼터 초과 | 중 | 중 | 쿼터 초과 에러 friendly 메시지 + Google One 유도 |
| `drive.file` scope 제한으로 과거 수동 업로드 파일 접근 불가 | 중 | 저 | 과거 파일은 수동 링크 방식 유지 (recordings 테이블 공존) |
| OAuth redirect URL 불일치로 401 | 중 | 높 | 개발 전 Console에서 `http://localhost:3000/api/auth/callback` + production URL 등록 확인 |

---

## 7. Success Criteria

- [ ] **SC-1**: 팀원이 재로그인 후 `users.google_refresh_token`에 token 저장됨
- [ ] **SC-2**: ContactDetail에서 파일 선택 → 업로드 완료 → Drive에 `/백지운CRM/{고객이름}/파일.mp3` 생성 확인
- [ ] **SC-3**: 업로드 완료 시 `recordings` 테이블에 drive_file_id 자동 저장
- [ ] **SC-4**: 업로드 진행률 UI 표시 (0-100%)
- [ ] **SC-5**: 50MB 초과 파일 업로드 시도 시 클라이언트에서 차단 + 에러 메시지
- [ ] **SC-6**: refresh_token 만료(401) 시 자동으로 재로그인 배너 표시
- [ ] **SC-7**: 빌드 통과 + Vercel 프로덕션 배포 후 end-to-end 업로드 성공

---

## 8. Timeline

| Phase | 예상 시간 | 산출물 |
|---|:---:|---|
| Design | 1 세션 (~2h) | `docs/02-design/features/team-crm-drive.design.md` |
| Do | 1-2 세션 (~4h) | 서버 모듈 + API + UI + 마이그레이션 |
| Check | 1 세션 (~1h) | Gap analysis |
| QA | 1 세션 (~1h) | L1 (API) + L2 (UI) + L3 (E2E 업로드 1건) |
| Report + Archive | ~30분 | 완료 문서 |

**총 예상**: 4-5 세션

---

## 9. Next Step

1. 대표님: Google Cloud Console에서 **Drive API 활성화** + **OAuth redirect URL 확인** (`http://localhost:3000/api/auth/callback`, Vercel 프로덕션 URL)
2. `/pdca design team-crm-drive` → 3가지 아키텍처 옵션 비교 후 선택
3. `pnpm add googleapis` 설치는 Do 단계에서

---

## Version

| Version | Date | Note |
|---------|------|------|
| 0.1 | 2026-04-23 | Checkpoint 1+2 완료 후 초안 작성 (부모 team-crm Match Rate 91.4% 기반 후속) |
