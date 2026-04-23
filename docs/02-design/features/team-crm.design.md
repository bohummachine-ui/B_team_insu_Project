# team-crm Design Document

> **Summary**: 백지운 지점 80명 팀 CRM — Pragmatic Feature Modules 아키텍처, Supabase BaaS + Google Drive API
>
> **Project**: 백지운 지점 팀 CRM
> **Version**: v1.0
> **Author**: Ben Nam
> **Date**: 2026-04-23
> **Status**: Draft
> **Planning Doc**: [team-crm.plan.md](../01-plan/features/team-crm.plan.md)

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

### 1.1 Design Goals

- **인증 완전성**: Google OAuth → Pending → 팀장 승인 → 서비스 진입 flow를 Supabase Auth + Middleware로 완전 처리
- **데이터 격리**: 모든 접근 제어를 Supabase RLS에서 강제 (앱 레이어 버그로도 노출 불가)
- **성능**: 80명 목록 가상 스크롤로 DOM 최소화, 이미지 IndexedDB 캐시로 클립보드 복사 < 500ms
- **실시간**: 근태 상태·자료 공유 토글을 Supabase Realtime으로 즉시 반영
- **모듈 경계**: 보험 모듈 임베드 슬롯을 명확한 인터페이스로 준비 (실제 구현 없이)

### 1.2 Design Principles

- **RLS is the gate**: 앱 레벨 권한 체크는 UX용, DB 레벨 RLS가 실제 보안 게이트
- **Features stay self-contained**: 각 feature 모듈은 내부에서 완결. 다른 feature를 직접 임포트하지 않음
- **Realtime by default**: 공유 상태(근태, is_shared)는 모두 Supabase Realtime 채널 구독
- **No premature abstraction**: 3번 이상 사용되지 않으면 공통화하지 않음

---

## 2. Architecture

### 2.0 Architecture Comparison & Selection

| 기준 | Option A: Flat | Option B: Clean | **Option C: Pragmatic** ✅ |
|------|:-:|:-:|:-:|
| 접근 | 화면 중심 단순 구조 | 레이어 엄격 분리 | 기능 모듈 + 실용적 경계 |
| 신규 파일 수 | ~80 | ~160 | ~120 |
| 복잡도 | 낮음 | 높음 | **중간** |
| 유지보수성 | 낮음 | 높음 | **높음** |
| 개발 속도 | 빠름 | 느림 | **중간** |
| 리스크 | 결합도 높음 | 과잉 설계 | **균형** |

**Selected: Option C — Pragmatic Modules**
**Rationale**: 외주 납품 후 벤이 계속 운영. features/ 모듈 단위로 보험 모듈 통합 작업이 명확해짐. Supabase BaaS 직접 사용으로 중간 레이어 최소화.

### 2.1 시스템 컴포넌트 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Next.js Client)                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  App Router  │  │  Zustand     │  │  TanStack      │  │
│  │  (routing)   │  │  (UI state)  │  │  Query (cache) │  │
│  └──────┬───────┘  └──────────────┘  └────────┬───────┘  │
│         │                                      │          │
│  ┌──────▼──────────────────────────────────────▼───────┐  │
│  │           features/ (Auth, Contacts, Library, ...)   │  │
│  │           components/layout/ (Header, Sidebar, Panel)│  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                  │
│         ┌───────────────┼──────────────────┐              │
│         ▼               ▼                  ▼              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ Supabase JS  │ │ Google Drive │ │  Clipboard API   │  │
│  │ (auth+db+    │ │ API Client   │ │  + IndexedDB     │  │
│  │  storage+    │ │              │ │  Cache           │  │
│  │  realtime)   │ │              │ │                  │  │
│  └──────┬───────┘ └──────┬───────┘ └──────────────────┘  │
└─────────┼────────────────┼─────────────────────────────────┘
          │                │
          ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│  Supabase Cloud  │  │  Google Cloud    │
│  - Postgres + RLS│  │  - Drive API     │
│  - Auth          │  │  - OAuth         │
│  - Storage       │  │                  │
│  - Realtime      │  │                  │
└──────────────────┘  └──────────────────┘
```

### 2.2 인증 플로우

```
[Browser]                    [Supabase Auth]           [DB: users]
   │                               │                       │
   │── Google OAuth 클릭 ─────────▶│                       │
   │                               │── OAuth 처리           │
   │                               │── JWT 발급            │
   │                               │── users.upsert ──────▶│
   │                               │   (status: pending)   │
   │◀── 리다이렉트: /pending ────────│                       │
   │                               │                       │
   │  [Admin 화면]                  │                       │
   │── 승인 클릭 ───────────────────────────────────────────▶│
   │                               │   (status: active)    │
   │── 다음 로그인 ────────────────▶│                       │
   │◀── /dashboard ─────────────────│                       │
```

**Middleware 처리** (`src/middleware.ts`):
```
모든 요청 → getSession() → 
  - session 없음 → /login
  - status = pending → /pending
  - status = rejected → /rejected
  - status = active → 통과
  - Admin 전용 경로 + role != admin → /dashboard
```

### 2.3 폴더 구조 (Option C)

```
src/
├── app/                              # App Router (페이지 레이아웃만)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── pending/page.tsx
│   │   └── rejected/page.tsx
│   ├── (main)/                       # 인증 후 공통 레이아웃
│   │   ├── layout.tsx                # Header + Sidebar + RightPanel
│   │   ├── dashboard/page.tsx
│   │   ├── contacts/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── library/page.tsx
│   │   ├── team/
│   │   │   ├── page.tsx
│   │   │   └── [userId]/page.tsx
│   │   ├── hub/page.tsx
│   │   ├── board/
│   │   │   ├── page.tsx
│   │   │   └── [postId]/page.tsx
│   │   ├── attendance/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/callback/route.ts    # Supabase OAuth callback
│       ├── attendance/ip/route.ts    # 사무실 IP 검증
│       └── drive/[...path]/route.ts  # Google Drive 프록시
│
├── components/
│   ├── ui/                           # shadcn/ui 커스텀 컴포넌트
│   └── layout/
│       ├── Header.tsx                # 출석 버튼 + 알림 + 프로필
│       ├── Sidebar.tsx               # 메뉴 내비게이션
│       └── RightPanel.tsx            # 글로벌 우측 슬라이드 패널
│
├── features/
│   ├── auth/
│   │   ├── components/               # LoginButton, PendingScreen
│   │   ├── hooks/                    # useAuth, useSession
│   │   └── services/authService.ts
│   ├── contacts/
│   │   ├── components/               # ContactList, ContactCard, ContactDetail
│   │   │   ├── ContactList.tsx       # 리스트뷰 + 필터
│   │   │   ├── ContactCard.tsx       # 카드뷰 아이템
│   │   │   ├── ContactDetail.tsx     # 상세 화면 레이아웃
│   │   │   ├── ContactForm.tsx       # 추가/수정 폼
│   │   │   ├── ShareToggle.tsx       # 공개 토글 위젯
│   │   │   ├── MaskingPreview.tsx    # 공개 미리보기 모달
│   │   │   └── InsuranceSlot.tsx     # 보험 모듈 임베드 슬롯
│   │   ├── hooks/                    # useContacts, useContact, useContactShare
│   │   └── services/contactService.ts
│   ├── library/
│   │   ├── components/               # LibraryTabs, ScriptList, TemplateList, etc.
│   │   ├── hooks/                    # useLibrary, useShareToggle
│   │   └── services/libraryService.ts
│   ├── team/
│   │   ├── components/               # TeamList, TeamDetail, VirtualList
│   │   ├── hooks/                    # useTeamMembers, useTeamMemberDetail
│   │   └── services/teamService.ts
│   ├── hub/
│   │   ├── components/               # HubGrid, HubFilters
│   │   ├── hooks/                    # useHub
│   │   └── services/hubService.ts
│   ├── board/
│   │   ├── components/               # PostList, PostDetail, PostForm, CommentList
│   │   ├── hooks/                    # usePosts, usePost
│   │   └── services/boardService.ts
│   ├── attendance/
│   │   ├── components/               # AttendanceButton, MonthlyTable, VirtualTable
│   │   ├── hooks/                    # useAttendance, useMonthlyTable
│   │   └── services/attendanceService.ts
│   ├── admin/
│   │   ├── components/               # PendingList, MemberList, BulkActions
│   │   ├── hooks/                    # useAdminMembers, useBulkApprove
│   │   └── services/adminService.ts
│   └── panel/
│       ├── components/               # TemplatePanel, ImagePanel, CopyButton
│       ├── hooks/                    # usePanel, useClipboard, useImageCache
│       └── services/clipboardService.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # 브라우저 Supabase 클라이언트
│   │   ├── server.ts                 # 서버 Supabase 클라이언트
│   │   └── middleware.ts             # 세션 갱신 + 권한 체크
│   └── google/
│       ├── driveClient.ts            # Drive API 클라이언트
│       └── tokenManager.ts           # refresh_token 암호화·갱신
│
├── store/
│   ├── panelStore.ts                 # 우측 패널 open/close, 탭
│   ├── attendanceStore.ts            # 현재 출퇴근 상태
│   └── uiStore.ts                    # 전역 UI 상태
│
├── types/
│   ├── database.types.ts             # Supabase 자동 생성 타입
│   ├── contact.ts
│   ├── library.ts
│   ├── attendance.ts
│   ├── team.ts
│   └── insurance.ts                  # 보험 모듈 인터페이스
│
└── middleware.ts                     # Next.js 미들웨어 (인증 게이트)
```

---

## 3. Data Model

### 3.1 Supabase 스키마 (핵심 테이블)

```sql
-- 팀 (단일 row)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin')),
  team_id UUID REFERENCES teams(id),
  profile_image_url TEXT,
  google_refresh_token TEXT,        -- 암호화 저장 필수
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES users(id),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사무실 IP
CREATE TABLE office_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  ip_address TEXT NOT NULL,
  label TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근태 로그
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('office','field','remote','hospital','dayoff','vacation','checkout')),
  ip_address TEXT,
  is_office BOOLEAN DEFAULT FALSE,
  first_logged_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 고객
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  carrier TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('M','F')),
  email TEXT,
  address TEXT,
  job TEXT,
  job_detail TEXT,
  job_code TEXT,
  weight NUMERIC,
  height NUMERIC,
  drives BOOLEAN DEFAULT FALSE,
  smokes BOOLEAN DEFAULT FALSE,
  family_info TEXT,
  memo TEXT,
  next_contact_date DATE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고객 마스킹 뷰 (공유 시 타팀원에게 보이는 뷰)
CREATE VIEW contacts_shared_view AS
SELECT
  id,
  owner_user_id,
  team_id,
  REGEXP_REPLACE(name, '(.).+', '\1○○') AS name,          -- 홍○○
  REGEXP_REPLACE(phone, '(\d{3}-)\d{4}(-\d{4})', '\1****\2') AS phone,
  REGEXP_REPLACE(birthday::TEXT, '-\d{2}-\d{2}$', '-**-**') AS birthday,
  NULL AS email,
  NULL AS address,
  NULL AS memo,
  gender,
  EXTRACT(YEAR FROM AGE(NOW(), birthday)) AS age,
  job,
  job_detail,
  next_contact_date,
  is_shared,
  created_at
FROM contacts
WHERE is_shared = TRUE;

-- 라벨
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 고객-라벨 매핑
CREATE TABLE contact_labels (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, label_id)
);

-- 스크립트
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[],
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 메시지 템플릿
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT CHECK (category IN ('greeting','info','proposal','closing')),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이미지 자료 (Supabase Storage)
CREATE TABLE image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  tags TEXT[],
  storage_path TEXT NOT NULL,       -- Supabase Storage 경로
  thumbnail_path TEXT,
  file_size INTEGER,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 녹음본 (Google Drive)
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  duration INTEGER,
  drive_file_id TEXT,               -- Google Drive 파일 ID
  drive_share_link TEXT,
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사례본
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('success','fail')),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 개인 메모장
CREATE TABLE personal_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시판
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  author_id UUID REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN ('notice','free','case','qna')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 댓글
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 즐겨찾기
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('script','template','image','recording','case')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
```

### 3.2 RLS 핵심 정책

```sql
-- 공통: active 사용자만 접근
CREATE POLICY "active_users_only" ON contacts
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- contacts: 본인 소유 OR (같은 팀 AND 공개)
CREATE POLICY "contacts_read" ON contacts FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR (
      team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND status = 'active')
      AND is_shared = TRUE
    )
  );

-- contacts: 마스킹 — RLS로 타팀원은 contacts_shared_view만 접근 허용
-- (실제로는 owner_user_id != auth.uid()인 경우 view 사용)

-- personal_memos: 본인만
CREATE POLICY "personal_memos_owner_only" ON personal_memos
  USING (owner_user_id = auth.uid());

-- users: admin만 status 변경
CREATE POLICY "admin_can_update_user_status" ON users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (true);
```

### 3.3 TypeScript 핵심 타입

```typescript
// types/database.types.ts (Supabase CLI로 자동 생성)
// types/contact.ts
export interface Contact {
  id: string
  ownerUserId: string
  teamId: string
  name: string
  phone: string
  carrier?: string
  birthday?: string
  gender?: 'M' | 'F'
  email?: string
  address?: string
  job?: string
  jobDetail?: string
  jobCode?: string
  weight?: number
  height?: number
  drives: boolean
  smokes: boolean
  familyInfo?: string
  memo?: string
  nextContactDate?: string
  isShared: boolean
  sharedAt?: string
  createdAt: string
  updatedAt: string
}

// 타팀원이 보는 마스킹된 고객 (contacts_shared_view)
export interface ContactSharedView {
  id: string
  ownerUserId: string
  name: string            // 홍○○
  phone: string           // 010-****-5678
  birthday?: string       // 1985-**-**
  gender?: 'M' | 'F'
  age?: number
  job?: string
  jobDetail?: string
  isShared: true
}

// types/attendance.ts
export type AttendanceStatus =
  | 'office' | 'field' | 'remote' | 'hospital'
  | 'dayoff' | 'vacation' | 'checkout'

export interface AttendanceLog {
  id: string
  userId: string
  date: string
  status: AttendanceStatus
  isOffice: boolean
  firstLoggedAt: string
}

// types/insurance.ts — 보험 모듈 임베드 인터페이스
export interface InsuranceModuleProps {
  customerId: string
  authToken: string
  userRole: 'member' | 'admin'
  readOnly?: boolean
  onDataChange?: (event: InsuranceModuleEvent) => void
}

export interface InsuranceModuleEvent {
  type: 'saved' | 'changed' | 'pdf_ready'
  customerId: string
  payload?: unknown
}
```

---

## 4. API Specification

### 4.1 Supabase 직접 호출 (주요 패턴)

대부분의 CRUD는 Supabase JS Client 직접 사용. Next.js API Routes는 서버 전용 로직(IP 검증, Drive 연동)에만 사용.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createServerSupabaseClient = () => {
  const cookieStore = cookies()
  return createServerClient(/* ... */)
}
```

### 4.2 Next.js API Routes (서버 전용)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/callback` | Supabase OAuth 콜백 처리 | - |
| GET | `/api/attendance/ip` | 클라이언트 IP 반환 | Required |
| POST | `/api/drive/upload` | Google Drive 파일 업로드 | Required |
| DELETE | `/api/drive/[fileId]` | Google Drive 파일 삭제 | Required |
| PATCH | `/api/drive/[fileId]/share` | Drive 공유 권한 ON/OFF | Required |

#### `GET /api/attendance/ip`

클라이언트 IP를 서버에서 안전하게 반환 (클라이언트 API로는 실제 IP 취득 불가).

**Response:**
```json
{ "ip": "123.45.67.89" }
```

#### `POST /api/drive/upload`

**Request:** `multipart/form-data` — file, title, category

**Response (201):**
```json
{
  "driveFileId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "driveShareLink": "https://drive.google.com/file/d/.../view"
}
```

### 4.3 Supabase Realtime 채널

```typescript
// 근태 상태 실시간 구독
const channel = supabase
  .channel('attendance_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendance_logs'
  }, handleAttendanceChange)
  .subscribe()

// 자료 공유 토글 실시간 구독
const shareChannel = supabase
  .channel('share_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'message_templates',
    filter: `team_id=eq.${teamId}`
  }, handleShareChange)
  .subscribe()
```

---

## 5. UI/UX Design

### 5.1 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: [로고] [출석 버튼 + 상태] ───────────── [알림] [프로필] │
├────────┬────────────────────────────────────────────┬───────────────┤
│        │                                            │               │
│ SIDE   │  MAIN CONTENT                              │  RIGHT PANEL  │
│ BAR    │  (각 화면 컴포넌트)                          │  (접힘 상태:  │
│        │                                            │   아이콘만)   │
│ 메뉴   │                                            │  펼침 상태:   │
│ only   │                                            │  320~380px)  │
│        │                                            │               │
└────────┴────────────────────────────────────────────┴───────────────┘
```

### 5.2 디자인 시스템 (토스 톤)

```typescript
// tailwind.config.ts 커스텀 토큰
colors: {
  primary: {
    DEFAULT: '#3182F6',   // 토스 시그니처 블루
    hover: '#1B64DA',
    light: '#EBF3FF',
  },
  success: '#00B493',
  warning: '#F7B731',
  danger: '#F04452',
  gray: {
    50: '#F9FAFB', 100: '#F2F4F6', 200: '#E5E8EB',
    300: '#D1D6DB', 400: '#B0B8C1', 500: '#8B95A1',
    600: '#6B7684', 700: '#4E5968', 800: '#333D4B', 900: '#191F28'
  }
},
fontFamily: {
  sans: ['Pretendard', 'system-ui', 'sans-serif']
},
borderRadius: {
  DEFAULT: '8px',
  lg: '12px',
  xl: '16px',
}
```

### 5.3 컴포넌트 목록

| Component | 위치 | 역할 |
|-----------|------|------|
| `Header` | `components/layout/Header.tsx` | 출석 버튼 드롭다운, 알림 벨, 프로필 메뉴 |
| `Sidebar` | `components/layout/Sidebar.tsx` | 메뉴 내비게이션 (아이콘 + 레이블) |
| `RightPanel` | `components/layout/RightPanel.tsx` | 슬라이드 패널, 탭(템플릿/이미지) |
| `VirtualList` | `components/ui/VirtualList.tsx` | react-window 래퍼, 80명 목록용 |
| `ShareToggle` | `features/contacts/components/ShareToggle.tsx` | 고객/자료 공개 토글 + 안내 |
| `CopyButton` | `features/panel/components/CopyButton.tsx` | 클립보드 복사 + 토스트 |
| `InsuranceSlot` | `features/contacts/components/InsuranceSlot.tsx` | 보험 모듈 임베드 슬롯 |

### 5.4 Page UI Checklist

#### 로그인 화면 (`/login`)
- [ ] Button: "Google로 시작하기" (구글 아이콘 + 텍스트, Primary 버튼)
- [ ] Text: 서비스 헤드라인 카피 (토스 톤)
- [ ] Text: 부제목 (서비스 소개 1~2줄)

#### 승인 대기 화면 (`/pending`)
- [ ] Text: "가입이 완료되었습니다. 팀장의 승인을 기다리는 중입니다."
- [ ] Display: 본인 이메일 + 이름 + 가입 일시
- [ ] Button: "팀장에게 승인 요청 알림 보내기"
- [ ] Icon: 대기 상태 아이콘 (로딩/시계)

#### 메인 대시보드 (`/dashboard`)
- [ ] Card: 본인 근태 현재 상태 + 상태 변경 버튼
- [ ] Card: 팀 근태 요약 (사무실 N / 외근 N / 재택 N)
- [ ] Widget: 팀 공지 최신 5건 (제목/작성자/날짜/NEW 배지)
- [ ] Widget: 새로 올라온 자료 최신 5건 (카테고리 배지/제목/작성자/NEW 배지)
- [ ] Widget: 새로 올라온 스크립트 최신 5건 (제목/작성자/NEW 배지)
- [ ] Widget: 새로 올라온 템플릿 최신 5건 (제목/빠른 복사 버튼/NEW 배지)
- [ ] Link: "팀 통합 자료 전체 보기" (Hub로 이동)
- [ ] State: 각 위젯 빈 상태 (empty state) 표시

#### 주소록 (`/contacts`)
- [ ] Toggle: 리스트뷰 / 카드뷰 전환
- [ ] Input: 통합 검색창 (이름·전화·메모, Ctrl+K 단축키)
- [ ] Filter: 라벨 다중 선택
- [ ] Filter: 진행 단계 선택
- [ ] Filter: 공개 여부 (전체/비공개만/공개됨만)
- [ ] Filter: 최근 연락일
- [ ] Column: 🔒/🌐 공개 여부 아이콘 (리스트뷰)
- [ ] Action: 벌크 선택 + 일괄 공개/비공개 전환
- [ ] Action: CSV/VCF 내보내기
- [ ] Button: "고객 추가" (FAB 또는 헤더 버튼)

#### 고객 상세 (`/contacts/[id]`)
- [ ] Card: 좌측 프로필 카드 (이름/나이/성별/전화/메모)
- [ ] Toggle: 공개 토글 위젯 (ShareToggle 컴포넌트)
- [ ] Text: 공개 시 마스킹 규칙 안내
- [ ] Button: "공개 미리보기" (모달)
- [ ] Tab: 현재 보험 (InsuranceSlot — placeholder)
- [ ] Tab: 리모델링 플랜 (InsuranceSlot — placeholder)
- [ ] Tab: 상담 메모 (텍스트 에디터)
- [ ] Tab: 히스토리 (타임라인)
- [ ] Tab: 파일·증권 (Google Drive 연동)
- [ ] Button: "인쇄용 자료 / PDF 내보내기"

#### 내 자료실 (`/library`)
- [ ] Tab: 대표 스크립트 / 메시지 템플릿 / 이미지 / 녹음본 / 사례본 / 메모
- [ ] Toggle: 각 항목 우측 🔒/🌐 공유 토글
- [ ] Badge: 비공개/공개 상태 배지
- [ ] Info: 이미지 탭 — 사용량 표시 (N/20장, N MB 사용)
- [ ] Warning: 이미지 한도 초과 시 안내 모달
- [ ] Checkbox: 녹음본 업로드 시 고객 동의 체크박스 (필수)
- [ ] Button: 항목 추가/편집/삭제

#### 팀원 (`/team`)
- [ ] Header: "백지운 지점 팀원 N명"
- [ ] Input: 검색창 (이름/역할)
- [ ] Filter: 역할 (전체/팀장/팀원)
- [ ] Sort: 이름순 / 공유 자료 많은 순 / 근태 상태순 / 가입일순
- [ ] List: 가상 스크롤 리스트 (아바타/이름/역할/근태 배지/공개 고객 수/공유 자료 수)
- [ ] Row: 본인 행 하이라이트 (인디케이터 + "나" 배지)
- [ ] Nav: 팀원 상세 화면 ← 이전 / 다음 → 네비게이션

#### 팀원 상세 (`/team/[userId]`)
- [ ] Tab: 공개 고객 리스트 (마스킹된 형태, 읽기 전용)
- [ ] Tab: 공유 스크립트
- [ ] Tab: 공유 메시지 템플릿 (클립보드 복사 버튼)
- [ ] Tab: 공유 이미지 (클립보드 복사 버튼)
- [ ] Tab: 공유 녹음본 (재생)
- [ ] Tab: 공유 사례본
- [ ] Badge: 읽기 전용 표시 (편집 불가)

#### 팀 통합 자료 Hub (`/hub`)
- [ ] Tab: 전체 / 스크립트 / 메시지 템플릿 / 이미지 / 녹음본 / 사례본
- [ ] Filter: 작성자 다중 선택 (체크박스)
- [ ] Filter: 등록일 (최근 1주/1개월/3개월)
- [ ] Toggle: 즐겨찾기만 보기
- [ ] Input: 통합 검색창
- [ ] Card: 이미지·템플릿에 클릭 복사 버튼

#### 게시판 (`/board`)
- [ ] Tab: 공지 / 자유 / 사례공유 / Q&A
- [ ] Badge: 상단 고정 포스트 핀 배지
- [ ] Button: 게시글 작성 (인증된 사용자)
- [ ] Action: 댓글 / 좋아요
- [ ] Role: 공지 탭 상단 고정 (팀장 전용)

#### 근태 센터 (`/attendance`)
- [ ] Table: 월간 출석표 (80행 가상 스크롤)
- [ ] Column: 좌측 이름 컬럼 sticky
- [ ] Group: 역할별 그룹화 헤더 (팀장/팀원) sticky
- [ ] Cell: 상태 컬러 + 최초 등록 시간 (09:02)
- [ ] Nav: 좌우 월 이동
- [ ] Button: CSV 내보내기 (팀장 전용)
- [ ] Card: 개인 월간 근태 리포트

#### 글로벌 우측 슬라이드 패널 (전 화면 공통)
- [ ] Toggle: 펼침/접힘 버튼 (단축키 `]`)
- [ ] Tab: 메시지 템플릿 / 이미지 자료
- [ ] Filter: 템플릿 카테고리 (인사/안내/제안/마무리/즐겨찾기)
- [ ] Input: 검색창 (양 탭 공통)
- [ ] Button: 클릭 → 클립보드 복사 → 토스트 "복사됨!"
- [ ] Text: 변수 치환 미리보기 (`{고객명}` → 실제값)
- [ ] Grid: 이미지 썸네일 3~4열 그리드
- [ ] State: 빈 상태 표시

#### 설정 - 팀원 관리 (`/settings` → 팀장 전용)
- [ ] Tab: Pending 승인 대기 (N) / Members (N) / 비활성 (N)
- [ ] Checkbox: 전체 선택 (Pending 탭)
- [ ] Button: 선택 항목 일괄 승인 (역할 선택 드롭다운)
- [ ] Button: 일괄 반려
- [ ] Modal: 역할 선택 후 확인 (승인 시)
- [ ] Modal: 사유 입력 (반려 시)
- [ ] Progress: 일괄 처리 진행 인디케이터
- [ ] List: Members 탭 — 가상 스크롤 + 역할/비활성화/삭제 액션

---

## 6. Error Handling

### 6.1 에러 유형별 처리

| 에러 상황 | 처리 방식 | 사용자 메시지 |
|-----------|-----------|---------------|
| 미인증 접근 | middleware에서 `/login` 리다이렉트 | - |
| pending 상태 접근 | middleware에서 `/pending` 리다이렉트 | - |
| RLS 차단 | `error.code === 'PGRST116'` → 빈 배열 반환 | 표시 안 함 (정상 동작) |
| 이미지 2MB 초과 | 업로드 전 클라이언트 검증 | "이미지는 최대 2MB까지 업로드 가능합니다." |
| 이미지 20장 초과 | 업로드 전 카운트 검증 | "이미지는 최대 20장까지 보유 가능합니다. 기존 이미지를 정리해주세요." |
| 클립보드 권한 거부 | `try/catch` → 브라우저 안내 | "클립보드 접근 권한이 필요합니다. 브라우저 설정에서 허용해주세요." |
| Safari 클립보드 미지원 | `ClipboardItem` 미지원 감지 | "이 기능은 Chrome, Edge, Whale 브라우저에서 지원됩니다." |
| Google Drive 토큰 만료 | `tokenManager.refresh()` 자동 갱신 → 실패 시 Drive 재연결 안내 | "Google Drive 연결이 끊어졌습니다. 다시 연결해주세요." |
| 네트워크 오류 | TanStack Query retry + toast 알림 | "연결이 불안정합니다. 잠시 후 다시 시도해주세요." |
| 승인 대기자 DB 오류 | Admin service에서 catch + rollback | "처리 중 오류가 발생했습니다. 다시 시도해주세요." |

---

## 7. Security Considerations

- [x] **RLS 강제**: 모든 테이블 RLS 활성화. `users.status = 'active'`가 아니면 전체 차단
- [x] **고객 마스킹 DB 뷰**: `contacts_shared_view`로 애플리케이션 버그 시에도 노출 불가
- [x] **Google Drive scope 최소화**: `drive.file`만 요청 (사용자 전체 드라이브 접근 X)
- [x] **refresh_token 암호화**: AES-256-GCM, `ENCRYPTION_KEY` 환경변수 기반
- [x] **세션 자동 만료**: Supabase 세션 30분 idle timeout 설정
- [x] **HTTPS 필수**: Vercel 배포 → 자동 HTTPS (Clipboard API 요구사항 충족)
- [x] **녹음본 동의 기록**: `consent_confirmed: true`가 없으면 업로드 차단
- [x] **데이터 내보내기 로깅**: CSV 내보내기 시 `audit_logs` 테이블에 기록
- [x] **XSS 방지**: React 기본 이스케이프 + 마크다운 렌더링 시 DOMPurify

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API | Supabase RLS 권한, Drive API 응답 | curl + Playwright request | Do |
| L2: UI Action | 각 페이지 UI 체크리스트 항목 | Playwright | Do |
| L3: E2E | 인증 flow, 상담 준비 flow | Playwright | Do |

### 8.2 L1: API 테스트 시나리오

| # | 엔드포인트 | 테스트 | 기대값 |
|---|----------|--------|--------|
| 1 | `contacts` (SELECT) | pending 사용자로 조회 | 빈 결과 (RLS 차단) |
| 2 | `contacts` (SELECT) | 타팀원 비공개 고객 조회 | 빈 결과 |
| 3 | `contacts` (SELECT) | 타팀원 공개 고객 조회 | 마스킹된 데이터 |
| 4 | `/api/attendance/ip` | 인증 없이 호출 | 401 |
| 5 | `/api/drive/upload` | 인증 후 파일 업로드 | 201 + driveFileId |
| 6 | `attendance_logs` (INSERT) | active 사용자 출근 등록 | 성공 |

### 8.3 L2: UI 액션 테스트 시나리오

| # | 페이지 | 액션 | 기대 결과 |
|---|--------|------|-----------|
| 1 | 로그인 | "Google로 시작하기" 클릭 | OAuth 화면으로 이동 |
| 2 | 주소록 | 공개 여부 필터 = "공개됨만" | is_shared=true인 고객만 표시 |
| 3 | 고객 상세 | 공개 토글 ON | 타팀원 화면에 즉시 반영 (Realtime) |
| 4 | 우측 패널 | 템플릿 클릭 | "복사됨!" 토스트 표시 |
| 5 | 우측 패널 | 이미지 클릭 | 이미지 클립보드 복사 완료 토스트 |
| 6 | 팀원 목록 | 80명 스크롤 | DOM 행 수 < 25 (가상 스크롤 확인) |

### 8.4 L3: E2E 시나리오

| # | 시나리오 | 단계 | 성공 기준 |
|---|----------|------|-----------|
| 1 | 가입 → 승인 flow | 구글 로그인 → pending 화면 → 팀장 승인 → 대시보드 진입 | 중간 단계에서 데이터 접근 차단 확인 |
| 2 | 카톡 영업 flow | 고객 상세 진입 → 우측 패널 열기 → 템플릿 클릭 복사 → 이미지 클릭 복사 | 클립보드에 올바른 내용 |
| 3 | 자료 공유 flow | 자료실 → 스크립트 is_shared 토글 ON → 팀 Hub에서 확인 | 즉시 반영 |
| 4 | 근태 등록 flow | 헤더 출석 버튼 → 상태 선택 → 월간 출석표 확인 | 당일 셀에 상태 표시 |

### 8.5 Seed Data 요구사항

| Entity | 최소 수 | 필수 필드 |
|--------|:-----:|-----------|
| users | 3명 | 1 admin + 1 active member + 1 pending |
| contacts | 5개 | 2 공개(is_shared=true) + 3 비공개 |
| message_templates | 5개 | 2 공유 + 3 비공개, 다른 카테고리 |
| image_assets | 3개 | 2 공유 + 1 비공개 (실제 이미지 파일) |
| attendance_logs | 해당 월 데이터 | 3명 × 5일 = 15 rows |
| posts | 3개 | 1 공지(is_pinned=true) + 2 일반 |

---

## 9. Clean Architecture (Dynamic Level)

### 9.1 레이어 구조

| 레이어 | 책임 | 위치 |
|--------|------|------|
| **Presentation** | 페이지, 컴포넌트, 커스텀 훅 (UI 상태만) | `src/app/`, `src/components/`, `src/features/*/components/`, `src/features/*/hooks/` |
| **Application** | 비즈니스 로직, 서비스 | `src/features/*/services/` |
| **Domain** | 타입, 인터페이스, 순수 로직 | `src/types/` |
| **Infrastructure** | Supabase, Google API, 외부 서비스 | `src/lib/supabase/`, `src/lib/google/` |

### 9.2 의존성 규칙

```
Presentation → Application → Domain ← Infrastructure
              └───────────→ Infrastructure
```

- Presentation: Application + Domain만 임포트
- Application: Domain + Infrastructure 임포트, Presentation 임포트 금지
- Domain: 순수 타입/로직만, 외부 의존성 없음
- Infrastructure: Domain만 임포트

---

## 10. Coding Convention

### 10.1 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ContactList`, `ShareToggle` |
| 훅 | camelCase + use | `useContacts`, `useShareToggle` |
| 서비스 | camelCase + Service | `contactService`, `attendanceService` |
| 스토어 | camelCase + Store | `panelStore`, `attendanceStore` |
| 상수 | UPPER_SNAKE_CASE | `MAX_IMAGES_PER_USER`, `OFFICE_TEAM_ID` |
| 타입/인터페이스 | PascalCase | `Contact`, `AttendanceLog` |
| 파일 (컴포넌트) | PascalCase.tsx | `ContactList.tsx` |
| 파일 (서비스/훅) | camelCase.ts | `contactService.ts`, `useContacts.ts` |
| 폴더 | kebab-case | `right-panel/`, `attendance-center/` |

### 10.2 Supabase 사용 패턴

```typescript
// 서비스 레이어에서 Supabase 직접 사용
// features/contacts/services/contactService.ts
import { createClient } from '@/lib/supabase/client'

export const contactService = {
  async getMyContacts(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async toggleShare(contactId: string, isShared: boolean) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .update({ is_shared: isShared, shared_at: isShared ? new Date().toISOString() : null })
      .eq('id', contactId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
```

---

## 11. Implementation Guide

### 11.1 의존성 설치 명령

```bash
# 인증 + DB
npm install @supabase/ssr @supabase/supabase-js

# 상태 관리
npm install zustand @tanstack/react-query

# 가상 스크롤
npm install react-window react-window-infinite-loader
npm install -D @types/react-window

# 폼 + 유효성 검사
npm install react-hook-form zod @hookform/resolvers

# UI 컴포넌트 (shadcn/ui — npx로 개별 설치)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input dialog sheet tabs badge

# 폰트 (next/font)
# Pretendard는 next/font/local 사용

# PDF
npm install @react-pdf/renderer

# PWA
npm install next-pwa

# 암호화 (서버 전용)
# Node.js 내장 crypto 모듈 사용 (별도 설치 불필요)

# 날짜 처리
npm install date-fns

# 이미지 처리 (클립보드용)
# Web API (canvas) 사용 — 별도 라이브러리 불필요
```

### 11.2 구현 순서

1. [ ] **Module 1 — Foundation**: Supabase 설정 + 인증 + 미들웨어 + 레이아웃
2. [ ] **Module 2 — Contacts**: 주소록 + 고객 상세 + 공개 토글 + 마스킹
3. [ ] **Module 3 — Library**: 내 자료실 + 공유 토글 + Supabase Storage 이미지
4. [ ] **Module 4 — Team & Hub**: 팀원 목록(가상 스크롤) + Hub + Realtime
5. [ ] **Module 5 — Attendance**: 근태 시스템 + IP 검증 + 월간 출석표
6. [ ] **Module 6 — Board + Settings + Admin**: 게시판 + 팀원 관리 일괄 처리
7. [ ] **Module 7 — Panel + PDF + PWA**: 우측 슬라이드 패널 + 클립보드 + PDF + PWA

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | 주요 작업 | 예상 세션 |
|--------|-----------|----------|:--------:|
| Foundation | `module-1` | Supabase Auth, 미들웨어, 레이아웃(헤더/사이드바), 타입 정의 | 1~2세션 |
| Contacts | `module-2` | 주소록 CRUD, 고객 상세, ShareToggle, InsuranceSlot | 2세션 |
| Library | `module-3` | 자료실 6탭, 공유 토글, Supabase Storage 이미지, Drive 연동 | 2세션 |
| Team & Hub | `module-4` | 팀원 가상 스크롤, Hub, Realtime 구독 | 2세션 |
| Attendance | `module-5` | 근태 버튼, IP 검증, 월간 출석표 가상 스크롤 | 1~2세션 |
| Board + Admin | `module-6` | 게시판 4탭, 팀원 관리 일괄 처리, 설정 | 2세션 |
| Panel + PDF + PWA | `module-7` | 우측 패널, 클립보드, IndexedDB 캐시, PDF, PWA | 2세션 |

#### Recommended Session Plan

| 세션 | 단계 | 범위 | 예상 소요 |
|------|------|------|:--------:|
| Session 1 | Plan + Design | 전체 | 완료 ✅ |
| Session 2 | Do | `--scope module-1` | 40~50 turns |
| Session 3 | Do | `--scope module-2` | 40~50 turns |
| Session 4 | Do | `--scope module-3` | 40~50 turns |
| Session 5 | Do | `--scope module-4` | 40~50 turns |
| Session 6 | Do | `--scope module-5` | 30~40 turns |
| Session 7 | Do | `--scope module-6` | 40~50 turns |
| Session 8 | Do | `--scope module-7` | 40~50 turns |
| Session 9 | Check + QA + Report | 전체 | 30~40 turns |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Option C Pragmatic Modules 기반 초안 | Ben Nam |
