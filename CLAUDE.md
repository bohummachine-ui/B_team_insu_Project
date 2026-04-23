# 백지운 지점 팀 CRM — 프로젝트 가이드

> **프로젝트**: 백지운 지점 팀 CRM v1.0
> **작성자**: Ben Nam (남윤영)
> **최종 업데이트**: 2026-04-23
> **기획서 위치**: `../files/백지운지점_팀CRM_기획서_v0.5.md`

---

## 프로젝트 개요

보험 설계사 약 80명(백지운 지점)을 위한 PC 전용 팀 CRM. 근태·고객관리·자료공유를 한 화면에서 처리.
카톡 영업을 지원하는 우측 슬라이드 패널(클릭 한 번 클립보드 복사)이 핵심 기능.

### 핵심 결정사항
- **단일 팀 전용**: 백지운 지점만. 멀티 팀/멀티 테넌트 확장 계획 없음
- **PC 전용**: 모바일 지원 계획 없음 (데스크탑 PWA 설치 지원)
- **보험 모듈 분리**: 현재 보험 + 리모델링 플랜은 벤이 별도 개발 후 통합 (임베드 슬롯만 준비)
- **이미지**: Supabase Storage (2MB/장, 20장/팀원 제한)
- **녹음/문서**: Google Drive API (사용자 본인 드라이브)

---

## 기술 스택

| 영역 | 스택 |
|------|------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (토스 테마) |
| 폰트 | Pretendard |
| Backend/DB | Supabase (Postgres + Auth + RLS + Storage + Realtime) |
| 인증 | Supabase Auth → Google OAuth (구글 로그인 only) |
| 파일 (이미지) | Supabase Storage |
| 파일 (녹음/문서) | Google Drive API |
| 실시간 | Supabase Realtime |
| 클립보드 | Clipboard API + ClipboardItem |
| PWA | next-pwa |
| 배포 | Vercel |

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 인증 관련 (login, pending, rejected)
│   ├── (main)/             # 메인 앱 레이아웃 (로그인 후)
│   │   ├── dashboard/      # 메인 대시보드
│   │   ├── contacts/       # 주소록
│   │   ├── contacts/[id]/  # 고객 상세
│   │   ├── library/        # 내 자료실
│   │   ├── team/           # 팀원 메뉴
│   │   ├── hub/            # 팀 통합 자료
│   │   ├── board/          # 게시판
│   │   ├── attendance/     # 근태 센터
│   │   └── settings/       # 설정
│   └── api/                # API Routes (필요시)
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트
│   ├── layout/             # Header, Sidebar, SlidePanel
│   └── features/           # 기능별 컴포넌트
├── features/               # 기능별 로직 (hooks, services, types)
│   ├── auth/
│   ├── contacts/
│   ├── library/
│   ├── team/
│   ├── attendance/
│   └── board/
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   ├── google/             # Google API 클라이언트
│   └── utils/
└── types/                  # 공통 TypeScript 타입
```

---

## 사용자 & 권한 모델

```
[Pending] → 가입 직후, 모든 기능 차단
[Member]  → 팀장 승인 후, 본인 데이터 CRUD + 공유 데이터 읽기
[Admin]   → 팀장, Member 권한 + 팀원 관리 + 사무실 IP + 라벨 관리
```

**핵심 규칙**:
- 구글 OAuth 로그인 = 계정 생성 (pending)
- 사용 권한 = 팀장 명시적 승인 필요
- Pending 상태에서 `/pending` 페이지 강제 리다이렉트
- RLS로 DB 레벨 강제 (애플리케이션 코드 버그로도 노출 안 되게)

---

## 데이터 공개 모델

- **고객**: 기본 비공개 (`is_shared: false`). 소유자가 토글 ON 시 팀 공개 (민감정보 마스킹)
- **자료**: 스크립트/템플릿/이미지/녹음본/사례본 모두 항목별 `is_shared` 토글
- **개인 메모장**: 공유 불가, 항상 비공개

마스킹 규칙: 이름(홍○○), 전화(010-****-5678), 생년월일(1985-**-**), 이메일/주소/메모 숨김

---

## 코딩 컨벤션

### 필수 규칙
- **불변성 (CRITICAL)**: 객체 직접 수정 금지, 항상 새 객체 반환
- **파일 크기**: 최대 800줄, 일반적으로 200~400줄
- **함수 크기**: 50줄 이하
- **오류 처리**: 모든 레벨에서 명시적 처리, 사용자에게 친화적 메시지
- **타입**: any 사용 금지, 모든 함수에 타입 명시

### 네이밍
- 컴포넌트: PascalCase (`CustomerCard.tsx`)
- 훅: camelCase + use 접두사 (`useContactList.ts`)
- 서비스: camelCase (`contactService.ts`)
- 상수: UPPER_SNAKE_CASE
- 타입/인터페이스: PascalCase (`Contact`, `AttendanceLog`)

### Supabase 패턴
- RLS 정책이 권한의 최종 게이트 — 앱 레벨 체크는 UX용
- `users.status != 'active'` → 모든 테이블 접근 차단
- 마스킹이 필요한 공유 고객 데이터는 DB 뷰(View) 레벨에서 처리

### 보안 필수사항
- 구글 OAuth Scope 최소화: `drive.file`만 사용 (사용자 전체 드라이브 접근 X)
- google_refresh_token은 DB 저장 시 암호화
- 세션 자동 만료: 30분 idle
- 데이터 내보내기 시 감사 로그 기록

---

## 핵심 기능 구현 참고

### 글로벌 우측 슬라이드 패널
- 위치: 화면 우측 끝, 모든 화면 공통 (레이아웃 레벨 구현)
- 상태: 펼침/접힘 토글 (단축키 `]`)
- 탭: 메시지 템플릿 / 이미지 자료
- 클립보드 복사: `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`
- HTTPS 필수, Chrome/Edge/Whale 권장 (Safari 미지원)

### 근태 가상 스크롤 (80명 대응)
- `react-window` 또는 동등 라이브러리 사용
- DOM에 보이는 행만 렌더링 (~20행)
- 좌측 이름 컬럼 sticky, 그룹 헤더 sticky

### 팀원 관리 일괄 처리
- 체크박스 다중 선택 → 일괄 승인/반려/비활성화
- 보험업 특성상 한 번에 5~10명 가입 → 필수 기능

### 보험 모듈 임베드 슬롯
- 고객 상세 페이지 탭에 `현재 보험` / `리모델링 플랜` 슬롯 확보
- 모듈에 `customer_id` + 인증 토큰 + 권한 컨텍스트 전달
- 현재는 빈 슬롯(placeholder) 구현 — 실제 모듈은 벤이 별도 개발

---

## 환경 변수

`.env.local` 파일 필요 (`.env.example` 참조):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_OFFICE_TEAM_ID=  # 단일 팀 ID
```

---

## 개발 단계 (외주 v1.0 납품 기준)

| 단계 | 내용 |
|------|------|
| Phase 1 | 인증/권한 (Google OAuth + 팀장 승인 + RLS) |
| Phase 2 | 레이아웃 (사이드바 + 헤더 + 우측 슬라이드 패널) |
| Phase 3 | 주소록 + 고객 상세 (기본정보 + 공개 토글) |
| Phase 4 | 내 자료실 (스크립트/템플릿/이미지/녹음본/사례본) |
| Phase 5 | 팀원 메뉴 + 팀 통합 자료(Hub) |
| Phase 6 | 게시판 |
| Phase 7 | 근태 시스템 (헤더 버튼 + 월간 출석표) |
| Phase 8 | 팀원 관리 (일괄 승인/액션) |
| Phase 9 | PDF 내보내기 + PWA 설정 + 최종 QA |

---

## 참조 문서

- 기획서: `../files/백지운지점_팀CRM_기획서_v0.5.md`
- PDCA Plan: `docs/01-plan/features/team-crm.plan.md`
- ERD: (별도 작성 예정 — Supabase 스키마 SQL)
- 디자인 시스템: (별도 작성 예정 — 토스 톤 토큰)
