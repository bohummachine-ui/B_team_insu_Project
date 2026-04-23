-- ============================================================
-- 백지운 지점 팀 CRM — Supabase Schema (전체 설치)
-- 실행 순서: Supabase Dashboard → SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- ── 확장 ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. 테이블 생성 (순환 FK 회피: teams 먼저 생성, users 생성 후 FK 추가)
-- ============================================================

-- 팀
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin')),
  team_id UUID REFERENCES teams(id),
  profile_image_url TEXT,
  google_refresh_token TEXT,
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES users(id),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- teams.owner_user_id FK를 이제 추가
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_owner_user_id_fkey,
  ADD CONSTRAINT teams_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES users(id);

-- 사무실 IP
CREATE TABLE IF NOT EXISTS office_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  ip_address TEXT NOT NULL,
  label TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근태 로그
CREATE TABLE IF NOT EXISTS attendance_logs (
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
CREATE TABLE IF NOT EXISTS contacts (
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

-- 라벨
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 고객-라벨
CREATE TABLE IF NOT EXISTS contact_labels (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, label_id)
);

-- 스크립트
CREATE TABLE IF NOT EXISTS scripts (
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
CREATE TABLE IF NOT EXISTS message_templates (
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

-- 이미지 자료
CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  tags TEXT[],
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size INTEGER,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 녹음본
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  duration INTEGER,
  drive_file_id TEXT,
  drive_share_link TEXT,
  consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사례본
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('success','fail')),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 개인 메모
CREATE TABLE IF NOT EXISTS personal_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시판
CREATE TABLE IF NOT EXISTS posts (
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
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 즐겨찾기
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('script','template','image','recording','case')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 고객 마스킹 뷰
CREATE OR REPLACE VIEW contacts_shared_view AS
SELECT
  id, owner_user_id, team_id,
  REGEXP_REPLACE(name, '(.).+', '\1○○') AS name,
  REGEXP_REPLACE(phone, '(\d{3}-)\d{4}(-\d{4})', '\1****\2') AS phone,
  REGEXP_REPLACE(birthday::TEXT, '-\d{2}-\d{2}$', '-**-**') AS birthday,
  NULL::TEXT AS email,
  NULL::TEXT AS address,
  NULL::TEXT AS memo,
  gender,
  EXTRACT(YEAR FROM AGE(NOW(), birthday)) AS age,
  job, job_detail, next_contact_date, is_shared, created_at
FROM contacts
WHERE is_shared = TRUE;

-- ============================================================
-- 2. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_team_shared ON contacts(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_scripts_team ON scripts(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_templates_team ON message_templates(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_images_team ON image_assets(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_recordings_team ON recordings(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_cases_team ON case_studies(team_id, is_shared);
CREATE INDEX IF NOT EXISTS idx_posts_team ON posts(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ============================================================
-- 3. auth.users → public.users 자동 동기화 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile_image_url, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'pending',
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. RLS 활성화
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. 헬퍼 함수 (is_active_member, is_admin, my_team_id)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- 6. RLS 정책
-- ============================================================

-- teams: 본인 팀만 읽기
DROP POLICY IF EXISTS teams_read ON teams;
CREATE POLICY teams_read ON teams FOR SELECT
  USING (id = public.my_team_id() OR public.is_admin());

DROP POLICY IF EXISTS teams_admin_write ON teams;
CREATE POLICY teams_admin_write ON teams FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- users: 본인 읽기 + 같은 팀 active 읽기 + admin 전체 관리
DROP POLICY IF EXISTS users_read_self ON users;
CREATE POLICY users_read_self ON users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_read_team ON users;
CREATE POLICY users_read_team ON users FOR SELECT
  USING (team_id = public.my_team_id() AND status = 'active');

DROP POLICY IF EXISTS users_read_admin ON users;
CREATE POLICY users_read_admin ON users FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS users_update_self ON users;
CREATE POLICY users_update_self ON users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS users_admin_manage ON users;
CREATE POLICY users_admin_manage ON users FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- office_ips: 같은 팀 active 읽기 + admin 쓰기
DROP POLICY IF EXISTS office_ips_read ON office_ips;
CREATE POLICY office_ips_read ON office_ips FOR SELECT
  USING (team_id = public.my_team_id() AND public.is_active_member());

DROP POLICY IF EXISTS office_ips_admin_write ON office_ips;
CREATE POLICY office_ips_admin_write ON office_ips FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- attendance_logs: 같은 팀 active 읽기, 본인 쓰기, admin 전체
DROP POLICY IF EXISTS attendance_read_team ON attendance_logs;
CREATE POLICY attendance_read_team ON attendance_logs FOR SELECT
  USING (
    public.is_active_member()
    AND user_id IN (SELECT id FROM users WHERE team_id = public.my_team_id())
  );

DROP POLICY IF EXISTS attendance_write_self ON attendance_logs;
CREATE POLICY attendance_write_self ON attendance_logs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- contacts: 본인 전체 권한 + 같은 팀 shared 읽기
DROP POLICY IF EXISTS contacts_read ON contacts;
CREATE POLICY contacts_read ON contacts FOR SELECT
  USING (
    public.is_active_member()
    AND (
      owner_user_id = auth.uid()
      OR (team_id = public.my_team_id() AND is_shared = TRUE)
    )
  );

DROP POLICY IF EXISTS contacts_write_owner ON contacts;
CREATE POLICY contacts_write_owner ON contacts FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- labels, contact_labels: 같은 팀 active
DROP POLICY IF EXISTS labels_all ON labels;
CREATE POLICY labels_all ON labels FOR ALL
  USING (team_id = public.my_team_id() AND public.is_active_member())
  WITH CHECK (team_id = public.my_team_id() AND public.is_active_member());

DROP POLICY IF EXISTS contact_labels_all ON contact_labels;
CREATE POLICY contact_labels_all ON contact_labels FOR ALL
  USING (public.is_active_member()) WITH CHECK (public.is_active_member());

-- Library 자료 공통 패턴: 본인 전체 + 같은 팀 shared 읽기
-- scripts
DROP POLICY IF EXISTS scripts_read ON scripts;
CREATE POLICY scripts_read ON scripts FOR SELECT
  USING (
    public.is_active_member()
    AND (owner_user_id = auth.uid() OR (team_id = public.my_team_id() AND is_shared = TRUE))
  );
DROP POLICY IF EXISTS scripts_write_owner ON scripts;
CREATE POLICY scripts_write_owner ON scripts FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- message_templates
DROP POLICY IF EXISTS templates_read ON message_templates;
CREATE POLICY templates_read ON message_templates FOR SELECT
  USING (
    public.is_active_member()
    AND (owner_user_id = auth.uid() OR (team_id = public.my_team_id() AND is_shared = TRUE))
  );
DROP POLICY IF EXISTS templates_write_owner ON message_templates;
CREATE POLICY templates_write_owner ON message_templates FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- image_assets
DROP POLICY IF EXISTS images_read ON image_assets;
CREATE POLICY images_read ON image_assets FOR SELECT
  USING (
    public.is_active_member()
    AND (owner_user_id = auth.uid() OR (team_id = public.my_team_id() AND is_shared = TRUE))
  );
DROP POLICY IF EXISTS images_write_owner ON image_assets;
CREATE POLICY images_write_owner ON image_assets FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- recordings
DROP POLICY IF EXISTS recordings_read ON recordings;
CREATE POLICY recordings_read ON recordings FOR SELECT
  USING (
    public.is_active_member()
    AND (owner_user_id = auth.uid() OR (team_id = public.my_team_id() AND is_shared = TRUE))
  );
DROP POLICY IF EXISTS recordings_write_owner ON recordings;
CREATE POLICY recordings_write_owner ON recordings FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- case_studies
DROP POLICY IF EXISTS cases_read ON case_studies;
CREATE POLICY cases_read ON case_studies FOR SELECT
  USING (
    public.is_active_member()
    AND (owner_user_id = auth.uid() OR (team_id = public.my_team_id() AND is_shared = TRUE))
  );
DROP POLICY IF EXISTS cases_write_owner ON case_studies;
CREATE POLICY cases_write_owner ON case_studies FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- personal_memos: 본인만
DROP POLICY IF EXISTS memos_self ON personal_memos;
CREATE POLICY memos_self ON personal_memos FOR ALL
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- posts: 같은 팀 active 읽기, 본인 쓰기, admin 전체
DROP POLICY IF EXISTS posts_read ON posts;
CREATE POLICY posts_read ON posts FOR SELECT
  USING (team_id = public.my_team_id() AND public.is_active_member());

DROP POLICY IF EXISTS posts_write_author ON posts;
CREATE POLICY posts_write_author ON posts FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS posts_admin_all ON posts;
CREATE POLICY posts_admin_all ON posts FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- comments
DROP POLICY IF EXISTS comments_read ON comments;
CREATE POLICY comments_read ON comments FOR SELECT
  USING (public.is_active_member());

DROP POLICY IF EXISTS comments_write_author ON comments;
CREATE POLICY comments_write_author ON comments FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

-- favorites: 본인만
DROP POLICY IF EXISTS favorites_self ON favorites;
CREATE POLICY favorites_self ON favorites FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 7. Realtime publication (Supabase Realtime 구독용)
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE scripts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_templates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE image_assets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- 8. 기본 팀 생성
-- ============================================================
INSERT INTO teams (name)
SELECT '백지운 지점'
WHERE NOT EXISTS (SELECT 1 FROM teams LIMIT 1);

-- ============================================================
-- 완료! 다음 단계:
-- 1) bohummachine@gmail.com 으로 Vercel 앱에서 Google 로그인
-- 2) 아래 promote-admin.sql 실행해서 팀장 승격
-- 3) SELECT id FROM teams; 값을 Vercel 환경변수 NEXT_PUBLIC_OFFICE_TEAM_ID 에 설정 → Redeploy
-- ============================================================
