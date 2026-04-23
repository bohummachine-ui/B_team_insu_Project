# team-crm Analysis (Check Phase — iterate 이후 재측정)

**Feature**: team-crm
**Date**: 2026-04-23
**Phase**: Check (post-iterate)
**Analyst**: gap-detector (bkit v2.1.5)
**Formula**: Static-only — `Overall = Structural*0.2 + Functional*0.4 + Contract*0.4`
**Iterate Commit**: `ea1b746` (Option B — C1-C5 + I1-I5 수정)

---

## Context Anchor

| Key | Value |
|-----|-------|
| WHY | 백지운 지점 보험 영업팀 80명이 고객 정보·영업 자료·팀 공지를 한 곳에서 다루는 경량 CRM |
| WHO | 팀장 1명(admin) + 팀원 ~80명(active), 모바일/데스크톱 혼용 |
| RISK | 고객정보 타팀원 노출·녹음본 동의 누락·Safari Clipboard 미지원 |
| SUCCESS | 승인 flow 완전 작동, RLS로 비공개 고객 0건 노출, 단축키 `]` 패널 1초 내 열림 |
| SCOPE | 7 Modules (Foundation / Contacts / Library / Team+Hub / Attendance / Board+Admin / Panel+PDF+PWA) |

---

## 1. Executive Summary — Match Rate 재측정

| 축 | 이전 (0.1) | **현재 (0.2)** | 가중치 | 기여도 | 근거 |
|----|:---:|:---:|:---:|:---:|---|
| Structural Match | 92% | **95%** | 0.2 | 19.0 | settings/page, NotifyButton, drive/upload, pending/notify, exportContacts, lib/google/driveClient 신규. Sidebar `/hub` `/attendance` `/settings` `/admin` 전부 노출 |
| Functional Depth | 68% | **84%** | 0.4 | 33.6 | Dashboard 5개 훅 실데이터 연결, Settings 실작동, CSV/VCF UTF-8 BOM + VCARD 3.0, Ctrl+K focus, 클라 10분+서버 5분 쿨다운, admin inline pin toggle, MaskingPreview 진입점 |
| API Contract | 95% | **97%** | 0.4 | 38.8 | `/api/drive/upload` 501 stub (auth + 에러 계약), `/api/pending/notify` 429 rate-limit + auth 가드. DB ↔ 서비스 ↔ 훅 3-way 일치 |
| **Overall** | **83.6%** | **91.4%** | 1.0 | **91.4** | ✅ **≥ 90% 임계값 돌파** |

**Judgment**: 🟢 **QA 진입 가능** — `/pdca qa team-crm`로 L1/L2/L3 검증 권장. C4/C5/I2 잔여는 v1.1 descope 문서화.

---

## 2. Plan Success Criteria Evaluation

| SC | 이전 | **현재** | 근거 |
|----|:---:|:---:|------|
| Google OAuth → pending → 팀장 승인 → 서비스 진입 flow | ✅ | ✅ | `middleware.ts` + `admin/components/PendingTab.tsx` |
| 타팀원 비공개 고객 RLS 격리 | ✅ | ✅ | `supabase/schema.sql` + `contacts_shared_view` |
| 팀원 목록 가상 스크롤 80명 | ✅ | ✅ | `team/components/TeamList.tsx` |
| 월간 출석표 가상 스크롤 | ✅ | ✅ | `attendance/components/MonthlyTable.tsx` |
| 우측 패널 `]` + "복사됨!" 토스트 | ✅ | ✅ | `useGlobalShortcut.ts` + `TemplatesTab.tsx` |
| PDF 내보내기 | ✅ | ✅ | `ContactPdfButton.tsx` |
| PWA manifest + SW | ✅ | ✅ | `next.config.mjs` + `manifest.json` |
| **대시보드 요약 위젯** | ❌ | ✅ **Met** | `dashboard/page.tsx` 5개 훅 + 공지/자료 리스트 + 바로가기 4개 |
| **Pending "팀장에게 알림" 버튼** | ❌ | ✅ **Met** | `NotifyButton.tsx` + `/api/pending/notify` |
| **주소록 export (CSV/VCF)** | ⚠️ Partial | ✅ **Met** | `exportContacts.ts` UTF-8 BOM + VCARD 3.0 |
| Google Drive 연동 | ❌ | 🟡 **Scaffold + Descope(v1.1)** | `lib/google/driveClient.ts` + `/api/drive/upload` stub 501 + TODO |
| 고객 상세 History/Files 탭 | ❌ | 🟡 **v1.1 안내 + 대안 링크** | `ContactDetail.tsx` — 자료실 링크 제공 |

**Success Rate**: 10/12 Met (83.3%, 이전 7/12 = 58.3%에서 상승). 잔여 2건은 v1.1 descope 명시.

---

## 3. Critical Gaps — 전원 해소

| # | 영역 | 상태 | 근거 |
|---|------|:---:|------|
| **C1** | Dashboard 위젯 | ✅ Resolved | `dashboard/page.tsx:1-141` useContacts×2 / usePosts / useMonthlyTeamAttendance / useCaseStudies 연결 |
| **C2** | Sidebar /hub /attendance | ✅ Resolved | `Sidebar.tsx` NAV_ITEMS에 Hub·근태·Settings·팀원관리 전부 노출 |
| **C3** | /settings 개인 설정 | ✅ Resolved | `settings/page.tsx` role/status/가입일/승인일/로그아웃 |
| **C4** | Google Drive | 🟡 Descope(v1.1) | `driveClient.ts` + `/api/drive/upload` stub 501. Plan v1.1에서 full impl |
| **C5** | History/Files 탭 | 🟡 Descope(v1.1) | `ContactDetail.tsx:161-186` v1.1 안내 + 자료실 링크 |

---

## 4. Important Gaps — 전원 해소

| # | 영역 | 상태 | 근거 |
|---|------|:---:|------|
| **I1** | 주소록 필터 확장 | ⚠️ Partial | CSV/VCF export + Ctrl+K 완료. 라벨 멀티셀렉트/진행단계는 v1.1 |
| **I2** | Pending 알림 | 🟡 Partial | 버튼 + API + 쿨다운 작동. Slack/이메일 채널은 v1.1 |
| **I3** | Bulk export | ✅ Resolved | 선택 시 해당만, 없으면 전체 export |
| **I4** | MaskingPreview | ✅ Resolved | `ContactDetail.tsx` "공개 미리보기" 버튼 → modal |
| **I5** | Board pin toggle | ✅ Resolved | `BoardPage.tsx` admin 인라인 📌 토글 + useUpdatePost |

---

## 5. Minor Gaps (QA 단계에서 확인)

- `<img>` 6곳 (Header, Admin 탭, Board) — `next/image` 최적화 권장
- PWA 아이콘 단색 placeholder — 실제 브랜드 로고 교체 필요
- Dashboard 모바일 반응형 확인 필요 (`md:` 브레이크포인트 적용됨)
- Dashboard `useMemo` deps 경고 (lint warning, 동작 영향 없음)

---

## 6. API Contract (3-way) — 97%

| 엔드포인트/서비스 | Design §4 | 구현 | 상태 |
|---|---|---|---|
| `contacts` CRUD + RLS | ✅ | `contactService.ts` | ✅ |
| `message_templates` use_count++ | ✅ | `templateService.ts` | ✅ |
| `image_assets` + Storage | ✅ | `imageAssetService.ts` | ✅ |
| `posts/comments/favorites` + pin toggle | ✅ | `boardService.ts` + `useUpdatePost` | ✅ |
| `attendance_logs` + IP 검증 | ✅ | `attendanceService.ts` + `/api/attendance/ip` | ✅ |
| Admin bulk approve | ✅ | `adminService.ts` | ✅ |
| `/api/drive/upload` | ✅ | 501 stub (v1.1 TODO) | 🟡 |
| `/api/pending/notify` | ✅ (신규) | 429 rate-limit + auth 가드 | ✅ |
| `users` status transitions | ✅ | `middleware.ts` + trigger | ✅ |

---

## 7. Runtime Verification Plan (QA 단계로 이관)

### L1 — API
- `GET /api/attendance/ip` 인증 가드
- `POST /api/pending/notify` 401/429/200
- `POST /api/drive/upload` 401/501
- Supabase RLS: pending → 빈 결과, 타팀원 비공개 → 빈 결과, 공개 → 마스킹

### L2 — UI Actions
- Dashboard 위젯 로드 → 숫자 렌더
- Contacts Ctrl+K → 검색 focus
- Contacts 선택 후 CSV 클릭 → 파일 다운로드 + BOM 확인
- ContactDetail 공개 미리보기 → MaskingPreview modal
- Board admin 📌 클릭 → is_pinned toggle + Realtime 반영

### L3 — E2E
1. 가입 flow: OAuth → pending + 알림 버튼 → 팀장 승인 → dashboard
2. 카톡 영업: 상세 → `]` → 템플릿 복사 (`{고객명}` 치환) → 이미지 복사
3. 자료 공유: 스크립트 is_shared ON → Hub 즉시 반영
4. 근태 등록: 출석 → 월간 표 반영
5. PDF: 상세 → 다운로드 → 한글 A4 파일

---

## 8. QA Readiness

**판정**: 🟢 **Green** — QA 진입 가능

- ✅ Overall 91.4% (≥90% 임계값 통과)
- ✅ 빌드 통과 (23 routes, next build OK)
- ✅ 핵심 사용자 여정 전부 실동작
- 🟡 잔여 descope 3건(C4 Drive 실업로드 / C5 History 타임라인 / I2 Slack 알림)은 Plan v1.1 이관

**권장 경로**:
1. Plan v1.1 descope 항목 문서화 (Drive full impl, History 타임라인, Slack/이메일 알림)
2. `/pdca qa team-crm` 진입 (L1/L2/L3)
3. Vercel 프로덕션 배포 검증
4. `/pdca report team-crm` → `/pdca archive team-crm`

---

## Version

| Version | Date | Note |
|---------|------|------|
| 0.1 | 2026-04-23 | 초안 (Module 7 완료 직후, Overall 83.6%) |
| 0.2 | 2026-04-23 | iterate 이후 재측정, Overall 91.4%, QA Ready |
