-- Design Ref: team-crm-drive.design.md §3.1 — Google Drive 연동 마이그레이션
-- Plan SC-1 (refresh_token 저장), SC-2 (폴더 구조), SC-3 (drive_file_id)

-- 1. users.google_refresh_token 추가 (at-rest encrypted by Supabase)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
COMMENT ON COLUMN users.google_refresh_token IS
  'Google OAuth refresh_token for Drive API (drive.file scope). Server-only access.';

-- 2. users RLS: 본인만 읽기/수정
DROP POLICY IF EXISTS users_own_token_select ON users;
CREATE POLICY users_own_token_select ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS users_own_token_update ON users;
CREATE POLICY users_own_token_update ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. recordings 테이블 확장 — Drive 업로드 메타
ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drive_web_view_link TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_recordings_customer ON recordings(customer_id);
CREATE INDEX IF NOT EXISTS idx_recordings_owner_uploaded ON recordings(owner_user_id, uploaded_at DESC);

-- 4. drive_folder_cache — 고객별 folderId 캐시 (Drive API 호출 최소화)
CREATE TABLE IF NOT EXISTS drive_folder_cache (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  folder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, customer_name)
);

ALTER TABLE drive_folder_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folder_cache_own ON drive_folder_cache;
CREATE POLICY folder_cache_own ON drive_folder_cache
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
