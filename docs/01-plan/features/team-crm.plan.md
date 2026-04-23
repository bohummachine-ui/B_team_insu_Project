# team-crm Planning Document

> **Summary**: 백지운 지점 약 80명을 위한 PC 전용 팀 CRM — 근태·고객·자료·팀 공유를 한 화면에서 처리
>
> **Project**: 백지운 지점 팀 CRM
> **Version**: v1.0
> **Author**: Ben Nam
> **Date**: 2026-04-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 보험 설계사들이 출근부(카톡)·고객관리(엑셀)·자료공유(단톡방)를 분산된 도구로 운영 → 지점장 실시간 파악 불가, 노하우 축적 안됨, 상담 준비 비효율(1건당 1~2시간) |
| **Solution** | PC 전용 단일 팀 CRM: Google OAuth + 팀장 승인 인증, 고객 기본 비공개 + 선택적 공유, 카톡 영업 지원 우측 슬라이드 패널(클릭 한 번 클립보드 복사) |
| **Function/UX Effect** | 토스 인슈어런스 톤(Pretendard + 시그니처 블루), 80명 가상 스크롤, 헤더 출석 버튼 + IP 자동 검증, 보험 모듈 임베드 슬롯, PWA 데스크탑 설치 |
| **Core Value** | 팀(지점) 단위 영업 운영 플랫폼 — 지점장은 팀 흐름을 한눈에, 팀원은 상담 준비부터 자료 공유까지 한곳에서 처리 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 분산 도구(카톡·엑셀·단톡방) 사용으로 지점장 실시간 파악 불가, 노하우 미축적, 상담 준비 비효율 |
| **WHO** | 백지운 지점 보험 설계사 ~79명 + 지점장 1명 (총 80명), PC 사용자, 구글 계정 보유 |
| **RISK** | Google OAuth Verification(drive.file 스코프 심사), Supabase RLS 누락 시 데이터 노출, 보험 모듈 통합 인터페이스 불일치 |
| **SUCCESS** | 80명 근태 등록/조회 정상 작동, 클립보드 복사 지연 < 500ms, 고객 공유 토글 즉시 반영, 팀장 승인 flow 완전 작동 |
| **SCOPE** | 외주 v1.0: 메인 CRM 전체(보험 모듈 슬롯 포함) / v1.0 통합: 보험 모듈 + 통합 배포(벤 담당) |

---

## 1. Overview

### 1.1 Purpose

백지운 지점 보험 설계사 80명이 출근부터 상담 마무리까지 하루 전체를 하나의 PC 기반 도구로 운영할 수 있게 한다.
지점장은 팀 흐름을 실시간으로 파악하고, 팀원들은 상담 준비·자료 공유·노하우 축적을 한 화면에서 처리한다.

### 1.2 Background

현재 보험 영업 지점의 도구 분산 문제:
- 출근 체크: 카카오톡 단톡방
- 고객 정보: 개인 엑셀, 종이 노트
- 보험 분석: 엑셀 또는 보험사 제공 도구
- 자료 공유: 단톡방, 이메일, USB
- 게시판/공지: 단톡방 공지

이 분산이 만드는 3가지 문제:
1. 지점장이 팀 상태를 실시간 파악 불가
2. 노하우가 축적되지 않음 (퇴사 시 소멸)
3. 상담 준비 비효율 (1건당 1~2시간)

### 1.3 Related Documents

- 기획서: `../../files/백지운지점_팀CRM_기획서_v0.5.md`
- ERD: (별도 작성 예정)
- 디자인 시스템: (별도 작성 예정)

---

## 2. Scope

### 2.1 In Scope (외주 v1.0)

**인증·권한**
- [x] Google OAuth 로그인 (only)
- [x] 가입 후 `/pending` 화면 + 팀장 알림
- [x] 팀장 승인 화면 (Pending → Member/Admin)
- [x] Member / Admin 역할 분리 + Supabase RLS 적용

**화면 (9개)**
- [x] ① 메인 대시보드 (공지/자료/스크립트/템플릿 최신순 위젯)
- [x] ② 주소록 (본인 고객 + 공개 여부 필터 + 벌크 액션)
- [x] ③ 고객 상세 (기본정보 + 공개 토글 + 마스킹 미리보기 + 보험 모듈 임베드 슬롯)
- [x] ④ 내 자료실 (스크립트/템플릿/이미지/녹음본/사례본/메모 + 항목별 공유 토글)
- [x] ⑤ 팀원 (80명 리스트뷰 + 가상 스크롤 + 팀원 선택 → 공개 고객·공유 자료 열람)
- [x] ⑥ 팀 통합 자료 Hub (카테고리·작성자별 필터 + 복사 버튼)
- [x] ⑦ 게시판 (공지/자유/사례공유/Q&A)
- [x] ⑧ 근태 센터 (월간 출석표 80행 가상 스크롤 + 역할별 그룹)
- [x] ⑨ 설정 (개인 + 팀장 전용: 팀원 관리·IP·라벨)

**핵심 기능**
- [x] 글로벌 우측 슬라이드 패널 (메시지 템플릿 + 이미지 자료, 클립보드 복사)
- [x] 헤더 출석 버튼 + 사무실 IP 자동 검증
- [x] 팀원 관리 일괄 승인·일괄 액션 (80명 운영 대응)
- [x] 라벨 시스템 (8개 기본 라벨 + 팀장 수정 가능)
- [x] 인쇄용 PDF 내보내기 (요약지/분석 리포트/비교 제안서)
- [x] Google Drive 연동 (녹음본·문서 저장 + 공유 권한 자동 관리)
- [x] Supabase Storage 이미지 (2MB/장, 20장/팀원 제한 검증)
- [x] PWA 설치 지원 (next-pwa)

### 2.2 Out of Scope

- 보험 모듈 실제 구현 (현재 보험 입력, 리모델링 플랜) — 벤 별도 개발
- 모바일 지원
- 멀티 팀/지점 확장
- AI 기능 (녹음 요약, OCR) — v1.5
- 카톡 연동 자동 발송 (클립보드 복사만) — v1.5
- 보험사 상품 DB 비교 — v2.0+

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Google OAuth 로그인 + Supabase Auth 연동 | High | Pending |
| FR-02 | 가입 후 pending 상태 → 팀장 알림 → 승인 flow | High | Pending |
| FR-03 | Member/Admin 역할 기반 접근 제어 (RLS) | High | Pending |
| FR-04 | 고객 `is_shared` 토글 + 마스킹 공개 미리보기 | High | Pending |
| FR-05 | 글로벌 우측 슬라이드 패널 (클립보드 텍스트/이미지 복사) | High | Pending |
| FR-06 | 메시지 템플릿 변수 자동 치환 (`{고객명}`, `{나이}` 등) | High | Pending |
| FR-07 | 헤더 출석 버튼 + 사무실 IP 검증 | High | Pending |
| FR-08 | 월간 출석표 80행 가상 스크롤 + 역할별 그룹 + CSV 내보내기 | High | Pending |
| FR-09 | 팀원 목록 80명 리스트뷰 + 가상 스크롤 | High | Pending |
| FR-10 | 팀원 관리 일괄 승인/반려/비활성화 | High | Pending |
| FR-11 | 자료 항목별 `is_shared` 토글 + 즉시 반영 | High | Pending |
| FR-12 | Supabase Storage 이미지 (2MB/20장 제한 검증) | Medium | Pending |
| FR-13 | Google Drive 연동 (녹음본/문서 업로드 + 공유 권한 자동 관리) | Medium | Pending |
| FR-14 | 게시판 4개 카테고리 + 댓글/좋아요/상단 고정 | Medium | Pending |
| FR-15 | 인쇄용 PDF 내보내기 (토스 톤 디자인) | Medium | Pending |
| FR-16 | 보험 모듈 임베드 슬롯 (인터페이스만, 실제 모듈 없음) | Medium | Pending |
| FR-17 | 고객 추가/수정 (기본정보 17개 필드 + 중복 전화번호 검사) | High | Pending |
| FR-18 | 주소록 필터 (라벨/진행단계/공개여부/최근연락일/즐겨찾기) | Medium | Pending |
| FR-19 | 팀 통합 자료 Hub (카테고리·작성자 필터 + 검색) | Medium | Pending |
| FR-20 | PWA 설치 지원 (next-pwa) | Low | Pending |
| FR-21 | Supabase Realtime (근태·자료 공유 토글 즉시 반영) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 이미지 클립보드 복사 지연 < 500ms | 직접 테스트 (IndexedDB 캐시 후) |
| Performance | 80명 목록 초기 렌더링 < 1s | Lighthouse / 직접 측정 |
| Performance | 페이지 전환 < 300ms | Core Web Vitals |
| Security | Supabase RLS 모든 테이블 적용 | RLS 정책 코드 리뷰 |
| Security | 구글 Drive OAuth scope = `drive.file`만 | OAuth 설정 확인 |
| Security | google_refresh_token 암호화 저장 | 코드 리뷰 |
| Security | 세션 자동 만료 30분 idle | 테스트 시나리오 |
| Security | 고객 마스킹 DB 뷰 레벨 강제 | RLS + View 코드 리뷰 |
| Accessibility | 가상 스크롤 키보드 탐색 지원 | 수동 테스트 |
| Compatibility | Chrome / Edge / Whale 지원 (클립보드 API) | 브라우저별 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 9개 화면 전체 구현 및 라우팅 정상 작동
- [ ] Google OAuth 로그인 → pending → 팀장 승인 → 서비스 진입 flow 완전 작동
- [ ] RLS 정책: active 상태가 아닌 사용자는 모든 데이터 접근 차단
- [ ] 고객 is_shared 토글 시 타팀원 화면에 즉시 반영 (Realtime)
- [ ] 우측 슬라이드 패널 클립보드 복사 (텍스트 + 이미지 PNG) 정상 작동
- [ ] 80명 가상 스크롤 (팀원 목록, 월간 출석표) 부드럽게 작동
- [ ] 팀원 관리 일괄 승인 정상 작동
- [ ] PDF 내보내기 3종 정상 생성
- [ ] PWA 설치 + 오프라인 기본 화면 작동
- [ ] Vercel 배포 완료

### 4.2 Quality Criteria

- [ ] 테스트 커버리지 80% 이상
- [ ] TypeScript 컴파일 에러 0
- [ ] ESLint 에러 0
- [ ] Lighthouse Performance 85점 이상
- [ ] 보안 체크리스트 통과 (RLS, 마스킹, 토큰 암호화, HTTPS)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Google OAuth drive.file 스코프 심사 거절 | High | Medium | 사전에 Google Cloud Console에서 심사 신청 + 개인 정보 처리방침 준비 |
| Supabase RLS 누락으로 데이터 노출 | High | Medium | 모든 테이블 RLS ON, 통합 테스트에서 권한별 접근 검증 |
| 이미지 클립보드 복사 Safari 미지원 | Low | High | Safari 사용 시 명확한 안내 메시지, Chrome 사용 권장 |
| 보험 모듈 인터페이스 불일치 | High | Low | 명세서 사전 합의 + customer_id·이벤트 타입 고정 |
| 80명 가상 스크롤 성능 이슈 | Medium | Low | react-window 사용 + DOM에 ~20행만 렌더링 |
| Google Drive 토큰 만료 처리 실패 | Medium | Medium | refresh_token 자동 갱신 로직 구현 + 에러 처리 |

---

## 6. Impact Analysis

> 신규 프로젝트 — 기존 코드베이스 없음. 영향 분석 해당 없음.

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | 단순 구조 | ☐ |
| **Dynamic** | 기능별 모듈, BaaS 통합 | ✅ |
| **Enterprise** | 엄격한 레이어 분리, DI | ☐ |

→ **Dynamic 레벨**: 기능별 features/ 모듈 구조, Supabase BaaS 통합

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Framework | Next.js 14 App Router | 기존 MegaTalk과 동일 스택, SSR/PWA 지원 |
| 인증 | Supabase Auth + Google OAuth | Supabase RLS와 네이티브 통합, JWT 자동 관리 |
| DB | Supabase Postgres + RLS | 권한 분리 DB 레벨 강제, Realtime 내장 |
| 파일 (이미지) | Supabase Storage | 클립보드 복사 성능 (Drive 토큰 불필요), RLS 적용 |
| 파일 (녹음/문서) | Google Drive API | 사용자 드라이브 저장 (용량 걱정 없음) |
| State | Zustand | 전역 상태 (슬라이드 패널, 근태 상태), 단순하고 가벼움 |
| 서버 상태 | TanStack Query | 서버 데이터 캐싱·무효화, Supabase 훅과 병행 |
| 가상 스크롤 | react-window | 80명 목록 성능, 검증된 라이브러리 |
| PDF | react-pdf 또는 puppeteer | 토스 톤 디자인 PDF 생성 |
| Styling | Tailwind + shadcn/ui | 빠른 컴포넌트 구축, 커스텀 토스 테마 적용 |

### 7.3 폴더 구조 (Dynamic 레벨)

```
src/
├── app/                    # App Router (라우팅만)
├── components/
│   ├── ui/                 # shadcn/ui 기반 컴포넌트
│   └── layout/             # Header, Sidebar, RightPanel
├── features/               # 기능별 독립 모듈
│   ├── auth/               # 인증 (hooks, services, types)
│   ├── contacts/           # 주소록 + 고객 상세
│   ├── library/            # 내 자료실
│   ├── team/               # 팀원 메뉴
│   ├── hub/                # 팀 통합 자료
│   ├── board/              # 게시판
│   ├── attendance/         # 근태
│   └── admin/              # 팀원 관리 (팀장 전용)
├── lib/
│   ├── supabase/           # Supabase 클라이언트 + 훅
│   └── google/             # Google API 클라이언트
└── types/                  # 공통 타입
```

---

## 8. Convention Prerequisites

### 8.1 환경 변수

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 (서버 전용) | Server |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Server |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Server |
| `NEXT_PUBLIC_APP_URL` | 앱 배포 URL | Client |
| `ENCRYPTION_KEY` | refresh_token 암호화 키 | Server |

### 8.2 Google Cloud Console 설정 필요

- OAuth 2.0 Client ID (웹 애플리케이션)
- 승인된 리디렉션 URI: Supabase Auth callback URL
- 활성화 API: Google Drive API
- Drive scope: `https://www.googleapis.com/auth/drive.file`
- 동의 화면 스코프: `email`, `profile`, `openid`, `drive.file`

---

## 9. Next Steps

1. [ ] Google Cloud Console OAuth 설정 + Supabase 프로젝트 생성
2. [ ] Next.js 프로젝트 초기화 완료 확인
3. [ ] Supabase 스키마 SQL 작성 (ERD 기반)
4. [ ] 디자인 시스템 문서 (토스 톤 컬러/타이포/스페이싱 토큰)
5. [ ] `/pdca design team-crm` 으로 Design 단계 진행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | 기획서 v0.5 기반 초안 | Ben Nam |
