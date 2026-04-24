# attendance-header-button Planning Document

> **Summary**: 출근 상태 변경 UI를 팝업 모달에서 헤더 인라인 버튼 7개로 교체
>
> **Project**: workspace (백지운 지점 팀 CRM)
> **Version**: v1.1+
> **Author**: Ben Nam
> **Date**: 2026-04-25
> **Status**: Plan 완료

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 출근 상태 변경 시 전체화면 overlay 팝업이 떠서 클릭 2번(버튼→선택) 필요. 작업 흐름을 끊는 UX |
| **Solution** | 헤더 우측에 7가지 상태 버튼을 인라인으로 나열 → 1클릭으로 즉시 상태 변경 |
| **Function/UX Effect** | overlay 제거, 팝업 없이 헤더에서 바로 상태 선택. 현재 상태 버튼은 강조 표시 |
| **Core Value** | 매일 출퇴근 등록 마찰 최소화 — 1클릭, 화면 전환 없음 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 팝업 모달이 작업 흐름을 끊고 클릭 수가 2배 필요한 UX 문제 |
| **WHO** | 백지운 지점 팀원 ~80명, 매일 출퇴근 등록 사용자 (PC 전용) |
| **RISK** | 헤더 공간 협소 — 7개 버튼 나열 시 타이틀·프로필과 충돌 가능 |
| **SUCCESS** | 헤더에서 1클릭으로 상태 변경, 모달 팝업 완전 제거, IP 검증 유지 |
| **SCOPE** | Header.tsx + AttendanceModal.tsx만 수정. PC 전용. 비즈니스 로직(IP 검증, DB upsert) 변경 없음 |

---

## 1. Overview

### 1.1 Purpose

출근 상태 변경을 모달 팝업 없이 헤더 인라인 버튼 1클릭으로 즉시 처리한다.

### 1.2 Background

현재 `Header.tsx`의 상태 pill을 클릭하면 `AttendanceModal`이 전체화면 overlay로 표시된다.
팀원들이 매일 수차례 사용하는 기능임에도 클릭 2회 + overlay 닫기가 필요한 UX 마찰이 있다.

### 1.3 Related Documents

- 현재 구현: `src/components/layout/Header.tsx`, `src/components/layout/AttendanceModal.tsx`
- 상태 훅: `src/features/attendance/hooks/useAttendance.ts`

---

## 2. Scope

### 2.1 In Scope

- [x] `Header.tsx`: pill 버튼 → 7개 인라인 상태 버튼으로 교체
- [x] 현재 선택 상태 버튼 강조 (bg-primary-50 + border)
- [x] 버튼 클릭 시 IP 검증 로직 유지 (office 선택 시 비사무실 IP 확인)
- [x] IP 정보 (현재 IP · 사무실 여부) 버튼 하단 혹은 tooltip으로 표시
- [x] `AttendanceModal.tsx` 사용 제거 (파일 삭제 또는 import 제거)
- [x] 로딩 중(isPending) 버튼 일괄 비활성화

### 2.2 Out of Scope

- 모바일 반응형 대응 (PC 전용)
- /attendance 페이지 내 `AttendanceCenter` 컴포넌트 변경 없음
- 출근 상태 종류 추가/제거
- 애니메이션 효과

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|:--------:|
| FR-1 | 헤더 우측에 7개 상태 버튼 인라인 나열 (사무실·외근·재택·병가·반차·휴가·퇴근) | P0 |
| FR-2 | 현재 상태 버튼 강조 표시 (primary 색상 테두리 + 배경) | P0 |
| FR-3 | 버튼 클릭 즉시 `useSetAttendanceStatus` 호출 | P0 |
| FR-4 | office 선택 시 비사무실 IP → `confirm()` 다이얼로그 유지 | P1 |
| FR-5 | isPending 중 버튼 전체 disabled + opacity | P1 |
| FR-6 | 현재 IP · 사무실 여부 텍스트 헤더 버튼 그룹 옆에 xs로 표시 | P2 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 빌드 | `pnpm build` 에러 0 |
| 타입 | TypeScript strict 통과 |
| 시각적 | 버튼 7개가 헤더 1줄 안에 들어와야 함 (overflow 없음) |

---

## 4. Success Criteria

- [ ] **SC-1**: 헤더에 7개 상태 버튼이 1줄로 표시됨
- [ ] **SC-2**: 버튼 클릭 → 모달 없이 즉시 DB 상태 변경 + 버튼 강조 전환
- [ ] **SC-3**: AttendanceModal import가 Header.tsx에서 제거됨
- [ ] **SC-4**: IP 검증 로직(office + 비사무실 confirm) 동작 유지
- [ ] **SC-5**: `pnpm build` 성공 + Vercel 배포 완료

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| 헤더 7버튼 + 프로필이 너무 좁아짐 | Medium | Medium | 버튼 텍스트 단축(아이콘+짧은 라벨) or 버튼 크기 xs로 설정 |
| IP 정보 fetch 지연 시 버튼 UX 불안 | Low | Low | IP 정보 로딩 중에도 버튼은 즉시 클릭 가능하게 유지 |
| AttendanceModal 삭제 시 다른 곳에서 사용 중일 경우 | Medium | Low | import 검색 후 단일 참조(Header.tsx만) 확인 후 삭제 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | 변경 내용 |
|----------|------|----------|
| `src/components/layout/Header.tsx` | Component | pill 버튼 제거 → 7개 인라인 버튼으로 교체 |
| `src/components/layout/AttendanceModal.tsx` | Component | 사용 제거 (import 삭제, 파일 보존) |

### 6.2 Current Consumers

| Resource | 사용처 | Impact |
|----------|--------|--------|
| AttendanceModal | Header.tsx (단일 사용) | ✅ Header.tsx에서만 import — 안전하게 제거 가능 |
| useSetAttendanceStatus | AttendanceModal.tsx → Header.tsx로 이동 | 로직 동일, 파일 이동만 |
| useServerIp | AttendanceModal.tsx → Header.tsx로 이동 | 동일 |
| useAttendanceStore | Header.tsx 기존 사용 중 | 변경 없음 |

---

## 7. Architecture Considerations

### 7.1 Project Level

**Dynamic** — 기존 feature-based 구조 유지. 수정 파일 2개(Header, AttendanceModal).

### 7.2 Key Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| IP 정보 표시 위치 | 버튼 그룹 왼쪽 xs 텍스트 | 헤더 공간 절약, 항상 노출 |
| 버튼 라벨 | 한글 짧은 라벨 그대로 (사무실·외근 등) | 기존 `ATTENDANCE_STATUS_LABEL` 재사용 |
| 상태 점(dot) | 각 버튼 왼쪽 색상 dot 유지 | 기존 `ATTENDANCE_STATUS_COLOR` 재사용 |
| AttendanceModal.tsx | import만 제거, 파일 보존 | 향후 재사용 가능성 |

---

## 8. Next Steps

1. `/pdca design attendance-header-button`
2. `/pdca do attendance-header-button`
3. 빌드 확인 + `git push` → Vercel 자동 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-25 | 초안 작성 | Ben Nam |
