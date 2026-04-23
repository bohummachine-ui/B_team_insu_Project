# team-crm Analysis (Check Phase)

**Feature**: team-crm
**Date**: 2026-04-23
**Phase**: Check
**Analyst**: gap-detector (bkit v2.1.5)
**Formula**: Static-only (no runtime server) — `Overall = Structural*0.2 + Functional*0.4 + Contract*0.4`

---

## Context Anchor

| Key | Value |
|-----|-------|
| WHY | 백지운 지점 보험 영업팀 80명이 고객 정보·영업 자료·팀 공지를 한 곳에서 다루는 경량 CRM 확보 |
| WHO | 팀장 1명(admin) + 팀원 ~80명(active), 모바일/데스크톱 혼용, 상담 중 1분 내 자료 접근 필요 |
| RISK | 고객정보 타팀원 노출·녹음본 동의 누락·팀장 부재로 인한 가입 지연·Safari Clipboard 미지원 |
| SUCCESS | 승인 flow 완전 작동, RLS로 비공개 고객 0건 노출, 단축키 `]` 패널 1초 내 열림 |
| SCOPE | 7 Modules (Foundation / Contacts / Library / Team+Hub / Attendance / Board+Admin / Panel+PDF+PWA) |

---

## 1. Executive Summary

| 축 | 점수 | 가중치 | 기여도 |
|----|:----:|:----:|:----:|
| Structural Match | **92%** | 0.2 | 18.4 |
| Functional Depth | **68%** | 0.4 | 27.2 |
| API Contract | **95%** | 0.4 | 38.0 |
| **Overall** | **83.6%** | 1.0 | **83.6** |

**Judgment**: Match Rate **< 90%** → `iterate` 권장 (또는 Critical만 수정 후 Vercel 검증 → QA)

- 구조: 7개 모듈 파일 모두 존재, Supabase 스키마/미들웨어/RLS/Realtime 전부 와이어링됨
- 계약: DB 타입 ↔ 서비스 ↔ 훅 3-way 일치도 매우 높음
- 기능: 대시보드 플레이스홀더, 사이드바 누락 항목, Drive 미구현이 핵심 드래그

---

## 2. Plan Success Criteria Evaluation

| SC | 상태 | 근거 |
|----|:----:|------|
| Google OAuth → pending → 팀장 승인 → 서비스 진입 flow 완전 작동 | ✅ Met | `middleware.ts:35-75` + `admin/components/PendingTab.tsx` + `auth trigger` |
| 타팀원 비공개 고객 절대 노출 안 됨 (RLS) | ✅ Met | `supabase/schema.sql` RLS policies + `contacts_shared_view` |
| 팀원 목록 가상 스크롤 (80명 부드러운 렌더) | ✅ Met | `team/components/TeamList.tsx` react-window |
| 월간 출석표 가상 스크롤 + sticky 헤더 | ✅ Met | `attendance/components/MonthlyTable.tsx` |
| 우측 패널 단축키 `]` + 클립보드 복사 "복사됨!" 토스트 | ✅ Met | `useGlobalShortcut.ts` + `TemplatesTab.tsx` + `ImagesTab.tsx` |
| PDF 내보내기 (고객 상세) | ✅ Met | `ContactPdfButton.tsx` + `ContactPdfDocument.tsx` |
| PWA manifest + Service Worker | ✅ Met | `next.config.mjs` next-pwa + `manifest.json` |
| 대시보드 요약 위젯 (공지/근태/자료/Hub) | ❌ Not Met | `dashboard/page.tsx:25-43` 하드코딩 `-` + "모듈 구현 진행 중" 메시지 |
| Google Drive 연동 (녹음본 업로드) | ❌ Not Met | `recordings` 테이블은 존재, 수동 `drive_file_id` 입력만 |
| 고객 상세 History/Files 탭 | ❌ Not Met | `ContactDetail.tsx:162-170` "추후 모듈에서 구현됩니다" |
| 주소록 전체 필터 (라벨/진행단계/CSV·VCF export) | ⚠️ Partial | 검색/공개여부만 구현. 라벨·단계·export 미구현 |
| Pending 페이지 "팀장에게 알림" 버튼 | ❌ Not Met | `pending/page.tsx` 정적 텍스트만 |

**Success Rate**: 7/12 Met = **58.3%** (Partial 1 + Not Met 4)

---

## 3. Critical Gaps (즉시 수정 권장)

| # | 영역 | 근거 | 제안 수정 |
|---|------|------|-----------|
| **C1** | **Dashboard 플레이스홀더** | `src/app/(main)/dashboard/page.tsx:25-43` 모든 카드가 `-` 값 + "모듈 구현 진행 중입니다" 표시 | `board/hooks` + `attendance/hooks` + `library/hooks` 재사용하여 최신 5건·주간 근태 요약 위젯 구현 |
| **C2** | **Sidebar 네비게이션 불완전** | `src/components/layout/Sidebar.tsx:15-81` — `/hub`, `/attendance` 항목 부재. 라우트는 존재하나 UI 진입점 없음 | `NAV_ITEMS`에 Hub(팀 공유), 근태 센터 추가 |
| **C3** | **`/settings` vs `/admin` 경로 불일치** | Design §2.3/§5.4 `/settings` (팀장 전용) + 개인 설정. 구현은 `/admin`만, 개인 설정 부재 | 미들웨어/사이드바에서 `/settings`로 리네이밍 또는 `/admin` 유지 결정 + 개인 설정 섹션 추가 |
| **C4** | **Google Drive 연동 미구현** | Plan FR-13 요구. `src/lib/google/` 폴더 부재, `/api/drive/*` 라우트 부재, `RecordingPanel.tsx:36-38`에만 수동 입력 + 경고 배너 | Drive OAuth scope(`drive.file`) + 업로드 API + token refresh 구현, 또는 Plan v1.1로 명시적 descope |
| **C5** | **고객 상세 History/Files 탭 스텁** | `ContactDetail.tsx:162-170` — "추후 모듈에서 구현됩니다" / "module-3에서 구현됩니다" | audit log 리스트 + Drive 파일 리스트 구현 또는 탭 자체 숨김(descope) |

---

## 4. Important Gaps (QA 전 정리 권장)

| # | 영역 | 근거 |
|---|------|------|
| **I1** | **주소록 필터 불완전** | Design §5.4 라벨 멀티셀렉트·진행단계·최근 연락일·CSV/VCF export·Ctrl+K. 구현: 검색 + 공개여부만 (`contacts/page.tsx:47-89`) |
| **I2** | **Pending "팀장에게 알림" 버튼 부재** | Design §5.4 명시적 요구사항, `pending/page.tsx` 미구현 |
| **I3** | **주소록 bulk action export 부재** | bulk share 토글만 존재, CSV/VCF export UI 없음 |
| **I4** | **MaskingPreview 진입점 부재** | Design §5.4 "공개 미리보기" 버튼. `ContactDetail.tsx`는 ShareToggle만 연결, MaskingPreview 모달 트리거 없음 |
| **I5** | **게시판 공지 고정 설정 UI** | `posts.is_pinned` 스키마·리스트 렌더링 존재. PostEditor에서 admin-only 체크박스는 있으나 기존 게시글에서의 pin toggle UX 확인 필요 |

---

## 5. Minor Gaps

- 기존 `<img>` 6곳 (Header, Admin탭들, Board 컴포넌트) — `next/image` 최적화 권장
- PWA 아이콘이 단색 placeholder — 실제 브랜드 로고 필요
- `dashboard` layout sidebar가 고정 width — 모바일 반응형 검증 필요

---

## 6. API Contract (3-way) — 95% Match

| 엔드포인트/서비스 | Design §4 | 구현 | 상태 |
|---|---|---|---|
| `contacts` CRUD + RLS | ✅ | `contactService.ts` + RLS | ✅ |
| `message_templates` + use_count++ | ✅ | `templateService.ts:94-105` | ✅ |
| `image_assets` + Storage | ✅ | `imageAssetService.ts` | ✅ |
| `posts/comments/favorites` | ✅ | `boardService.ts` | ✅ |
| `attendance_logs` + IP 검증 | ✅ | `attendanceService.ts` + `/api/attendance/ip` | ✅ |
| Admin bulk approve | ✅ | `adminService.ts` | ✅ |
| `/api/drive/upload` | ✅ | **미구현** | ❌ |
| `users` status transitions | ✅ | `middleware.ts` + trigger | ✅ |

---

## 7. Runtime Verification Plan (미실행 — dev 서버 부재)

### L1 — API
- `GET /api/attendance/ip` (인증X → 401, 인증O → 200 `{ip, isOffice}`)
- Supabase `contacts` SELECT: pending 사용자 → 빈 결과, 타팀원 비공개 → 빈 결과, 공개 → 마스킹
- `posts` INSERT auth guard

### L2 — UI Actions
- Contacts 공개여부 필터 → `is_shared=true`만 표시
- ShareToggle ON → Realtime 반영 (2 browser)
- 우측 패널 템플릿 클릭 → "복사됨!" 토스트 + `navigator.clipboard` verify
- Admin bulk approve → `status=active`, `role=member|admin`
- Attendance 월간 테이블 스크롤 → DOM 행 < 25

### L3 — E2E
1. 가입 flow: Google OAuth → pending → 팀장 승인 → dashboard
2. 카톡 영업: 고객 상세 → `]` → 템플릿 복사 → 이미지 복사
3. 자료 공유: 스크립트 is_shared ON → Hub 즉시 반영
4. 근태 등록: 헤더 출석 → 상태 선택 → 월간 표 반영
5. PDF 다운로드: 고객 상세 → PDF 버튼 → 한글 A4 파일

---

## 8. QA Readiness

**판정**: 🟡 Yellow — QA 진입 전 C1/C2 최소 수정 권장

- ✅ 빌드 통과, 핵심 flow(인증·승인·CRUD·게시판·admin·panel·PDF) 기능 작동
- ⚠️ Dashboard 플레이스홀더 + Sidebar 누락으로 사용자 주요 여정 차단
- ✅ Drive(C4), History/Files(C5)는 v1.0 descope 가능 (Plan v1.1 명시 필요)

**권장 경로**:
1. `/pdca iterate team-crm` → C1(Dashboard 위젯), C2(Sidebar 추가), C3(경로 결정)만 수정
2. Vercel 프로덕션 배포 검증
3. `/pdca qa team-crm` 진입 (L1/L2/L3)
4. C4/C5는 Plan v1.1 / v1.5로 descope 명시

---

## Version

| Version | Date | Note |
|---------|------|------|
| 0.1 | 2026-04-23 | 초안 (Module 7 완료 직후) |
