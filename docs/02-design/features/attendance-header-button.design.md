# attendance-header-button Design Document

> **Summary**: 출근 상태 UI를 모달 팝업에서 헤더 인라인 버튼(AttendanceStatusBar)으로 교체
>
> **Project**: workspace (백지운 지점 팀 CRM)
> **Version**: v1.1+
> **Author**: Ben Nam
> **Date**: 2026-04-25
> **Status**: Design 완료 (Option B 선택)
> **Planning Doc**: [attendance-header-button.plan.md](../01-plan/features/attendance-header-button.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 팝업 모달이 매일 수차례 사용하는 출퇴근 등록의 UX 마찰 유발 — 클릭 2회 + overlay |
| **WHO** | 백지운 지점 팀원 ~80명, PC 전용 사용자 |
| **RISK** | 헤더 공간 협소 — 7버튼 + 프로필이 1줄에 들어와야 함 |
| **SUCCESS** | 헤더 1클릭으로 즉시 상태 변경, 모달 완전 제거, IP 검증 유지 |
| **SCOPE** | Header.tsx + 신규 AttendanceStatusBar.tsx. 모바일 미지원. 비즈니스 로직 변경 없음 |

---

## 1. Overview

### 1.1 Design Goals

- `AttendanceModal` overlay 완전 제거
- `AttendanceStatusBar` 컴포넌트 신규 생성 — 7개 인라인 버튼 + IP 검증 로직 캡슐화
- `Header.tsx`는 `<AttendanceStatusBar />`만 렌더링 — 단순화

### 1.2 Design Principles

- **단일 책임**: `AttendanceStatusBar`가 출근 상태 UI + 로직을 모두 담당
- **최소 변경**: 비즈니스 로직(훅, 서비스, DB) 무변경
- **기존 타입/상수 재사용**: `ATTENDANCE_STATUS_LABEL`, `ATTENDANCE_STATUS_COLOR`, `STATUS_ORDER`

---

## 2. Architecture — Option B (컴포넌트 분리)

```
src/components/layout/
  ├── Header.tsx              (수정: AttendanceModal → AttendanceStatusBar)
  ├── AttendanceStatusBar.tsx (신규: 버튼 7개 + IP 검증 로직)
  └── AttendanceModal.tsx     (유지: import만 제거, 파일 보존)
```

### 데이터 흐름

```
Header.tsx
  └── <AttendanceStatusBar />
        ├── useAttendanceStore()     → currentStatus (현재 상태)
        ├── useSetAttendanceStatus() → mutateAsync(status) (상태 변경)
        └── useServerIp()            → ipInfo (IP 검증)
```

---

## 3. Component Spec

### 3.1 AttendanceStatusBar

**파일**: `src/components/layout/AttendanceStatusBar.tsx`

```
┌──────────────────────────────────────────────────────────────┐
│  192.168.x.x · 사무실                                         │  ← IP 정보 (xs, gray)
│  [● 사무실] [● 외근] [● 재택] [● 병가] [● 반차] [● 휴가] [● 퇴근]  │  ← 버튼 7개
└──────────────────────────────────────────────────────────────┘
```

**버튼 상태별 스타일:**

| 상태 | 스타일 |
|------|--------|
| 현재 선택됨 | `bg-primary-50 text-primary border border-primary-200` |
| 미선택 | `bg-gray-50 text-gray-700 hover:bg-gray-100` |
| isPending | `opacity-50 cursor-not-allowed` (전체 버튼) |

**Props**: 없음 (자체 훅으로 상태 관리)

### 3.2 Header.tsx 변경

**Before:**
```tsx
import AttendanceModal from './AttendanceModal'
const [showAttendance, setShowAttendance] = useState(false)

// 헤더 안:
<button onClick={() => setShowAttendance(true)}>
  <span className={statusColor} />
  {statusLabel}
</button>

{showAttendance && <AttendanceModal onClose={() => setShowAttendance(false)} />}
```

**After:**
```tsx
import AttendanceStatusBar from './AttendanceStatusBar'

// 헤더 안:
<AttendanceStatusBar />
```

제거 항목: `AttendanceModal` import, `showAttendance` state, `useAttendanceStore`, `useTodayAttendance`, `statusColor`, `statusLabel`, `useEffect` (상태 동기화 — AttendanceStatusBar로 이동)

---

## 4. IP 검증 로직 (AttendanceStatusBar 내부)

```typescript
const handleSelect = async (status: AttendanceStatus) => {
  if (status === 'office' && ipInfo && !ipInfo.isOffice) {
    if (!confirm('사무실 IP가 아닙니다. "사무실 출근"으로 계속 등록하시겠습니까?')) return
  }
  try {
    await setStatus.mutateAsync(status)
  } catch (e) {
    // toast 또는 alert으로 에러 표시
    alert(e instanceof Error ? e.message : '등록 실패')
  }
}
```

---

## 5. Page UI Checklist

- [ ] 7개 버튼 헤더 1줄 안에 표시 (overflow-x 없음)
- [ ] 현재 상태 버튼 primary 강조 표시
- [ ] 각 버튼 좌측 색상 dot (`ATTENDANCE_STATUS_COLOR`)
- [ ] IP 정보 텍스트 (사무실/외부) 버튼 그룹 위에 xs로 표시
- [ ] isPending 중 전체 버튼 disabled
- [ ] AttendanceModal overlay가 더 이상 렌더링되지 않음

---

## 6. 헤더 레이아웃 고려

**헤더 우측 구성 (after):**
```
[사무실][외근][재택][병가][반차][휴가][퇴근]    [avatar] Ben Nam
```

버튼 크기: `px-2.5 py-1 text-xs` — 기존 pill보다 작게, 공간 최적화
버튼 간격: `gap-1`
전체 그룹: `flex items-center gap-1`

---

## 7. Risks & Decisions

| Risk | 결정 |
|------|------|
| 헤더 너비 부족 | 버튼 `text-xs`, `px-2.5 py-1`로 최소화. 헤더 px-6 유지 |
| useEffect(today sync) 이동 | AttendanceStatusBar 내부로 이동 — Header에서 제거 |
| AttendanceModal 삭제 여부 | 파일 보존, import만 제거 (향후 재사용 가능성) |

---

## 8. Test Plan

| # | 시나리오 | 검증 방법 |
|---|---------|----------|
| T1 | 헤더에 7개 버튼 렌더링 확인 | 시각적 확인 |
| T2 | 버튼 클릭 → DB 상태 변경 + 강조 전환 | 클릭 후 버튼 스타일 변경 |
| T3 | office 선택 + 비사무실 IP → confirm 다이얼로그 | IP 테스트 환경에서 확인 |
| T4 | AttendanceModal overlay 미노출 확인 | DOM 검사 |
| T5 | pnpm build 성공 | CI 빌드 |

---

## 9. Implementation Guide

### 9.1 구현 순서

1. `AttendanceStatusBar.tsx` 신규 생성
   - `useAttendanceStore`, `useSetAttendanceStatus`, `useServerIp`, `useTodayAttendance` 훅 사용
   - `STATUS_ORDER` 7개 버튼 렌더링
   - IP 검증 로직 (`handleSelect`)
   - `useEffect` (today 상태 동기화) 이전

2. `Header.tsx` 수정
   - 기존 `AttendanceModal` import 제거
   - 관련 state/useEffect/hooks 제거
   - `<AttendanceStatusBar />` 삽입

3. `pnpm build` 확인 → commit → push

### 9.2 Session Guide

| Module | 파일 | 작업량 |
|--------|------|--------|
| module-1 | `AttendanceStatusBar.tsx` (신규) | ~60 LOC |
| module-2 | `Header.tsx` (수정) | -20 LOC (제거) |

**추천**: 단일 세션 (총 ~30분)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-25 | Option B 선택, Design 완료 | Ben Nam |
