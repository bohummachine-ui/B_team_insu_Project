-- Design Ref: recording-stt.design.md §3.1 — Vault + recordings 확장
-- Plan SC-2: API 키는 DB 평문으로 조회 불가 (Supabase Vault 암호화)

-- ──────────────────────────────────────────────
-- 1. Extensions
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ──────────────────────────────────────────────
-- 2. users.gemini_key_secret_id — Vault secret 참조
-- ──────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gemini_key_secret_id UUID;

COMMENT ON COLUMN public.users.gemini_key_secret_id IS
  'vault.secrets(id) 참조. 사용자별 Gemini API 키의 암호화 저장 위치.';

-- ──────────────────────────────────────────────
-- 3. recordings 확장 — STT 필드
-- ──────────────────────────────────────────────
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS transcript_status TEXT
    NOT NULL DEFAULT 'pending'
    CHECK (transcript_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS transcript_model TEXT,
  ADD COLUMN IF NOT EXISTS transcript_error TEXT,
  ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recordings_transcript_status
  ON public.recordings (transcript_status)
  WHERE transcript_status IN ('pending', 'processing');

-- ──────────────────────────────────────────────
-- 4. RPC: set_user_gemini_key — 사용자 본인 키 등록/갱신
--    SECURITY DEFINER, authenticated role 실행 가능
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_gemini_key(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing UUID;
  v_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_key IS NULL OR length(trim(p_key)) < 20 THEN
    RAISE EXCEPTION 'invalid_key' USING ERRCODE = '22023';
  END IF;

  SELECT gemini_key_secret_id INTO v_existing
    FROM public.users WHERE id = v_user_id;

  v_name := 'gemini_key_' || v_user_id::text;

  IF v_existing IS NOT NULL THEN
    -- 기존 secret 업데이트
    PERFORM vault.update_secret(v_existing, trim(p_key), v_name, NULL);
  ELSE
    -- 신규 secret 생성 후 users에 연결
    v_existing := vault.create_secret(trim(p_key), v_name, 'Gemini API key for STT');
    UPDATE public.users
      SET gemini_key_secret_id = v_existing
      WHERE id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_gemini_key(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_gemini_key(TEXT) TO authenticated;

-- ──────────────────────────────────────────────
-- 5. RPC: delete_user_gemini_key — 본인 키 삭제
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_gemini_key()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_secret_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT gemini_key_secret_id INTO v_secret_id
    FROM public.users WHERE id = v_user_id;

  IF v_secret_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.users
    SET gemini_key_secret_id = NULL
    WHERE id = v_user_id;

  DELETE FROM vault.secrets WHERE id = v_secret_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_gemini_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_gemini_key() TO authenticated;

-- ──────────────────────────────────────────────
-- 6. RPC: get_user_gemini_key — service_role 전용
--    서버 사이드 transcribe route에서만 호출
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_gemini_key(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_key TEXT;
BEGIN
  SELECT gemini_key_secret_id INTO v_secret_id
    FROM public.users WHERE id = p_user_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE id = v_secret_id;

  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_gemini_key(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_gemini_key(UUID) TO service_role;

-- ──────────────────────────────────────────────
-- 7. RPC: has_user_gemini_key — 본인 등록 여부만 반환
--    authenticated 가능. 평문 키는 노출 안 함
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_user_gemini_key()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_secret_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT gemini_key_secret_id INTO v_secret_id
    FROM public.users WHERE id = v_user_id;

  RETURN v_secret_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.has_user_gemini_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_user_gemini_key() TO authenticated;
