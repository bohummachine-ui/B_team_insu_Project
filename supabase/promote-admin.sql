-- ============================================================
-- 팀장 승격 SQL (bohummachine@gmail.com)
-- 실행 전 필수: 해당 이메일로 Vercel 앱에서 Google 로그인 1회 완료
-- ============================================================

-- 1) 로그인했는지 확인
SELECT id, email, created_at FROM auth.users WHERE email = 'bohummachine@gmail.com';
-- → 1 row 반환되어야 함. 0 row 면 먼저 Google 로그인 필요.

-- 2) public.users 에 row 있는지 확인
SELECT id, email, status, role, team_id FROM public.users WHERE email = 'bohummachine@gmail.com';
-- → 1 row 면 OK (트리거 동작함). 0 row 면 아래 "복구" 블록 실행.

-- 3) 팀장으로 승격
UPDATE public.users
SET
  role = 'admin',
  status = 'active',
  team_id = (SELECT id FROM teams WHERE name = '백지운 지점' LIMIT 1),
  approved_at = NOW(),
  name = COALESCE(name, '팀장')
WHERE email = 'bohummachine@gmail.com'
RETURNING id, email, role, status, team_id;

-- 4) 팀 owner 로 지정
UPDATE teams
SET owner_user_id = (SELECT id FROM public.users WHERE email = 'bohummachine@gmail.com')
WHERE name = '백지운 지점';

-- 5) team_id 확인 → 이 UUID를 Vercel 환경변수 NEXT_PUBLIC_OFFICE_TEAM_ID 에 넣기
SELECT id AS team_id, name FROM teams;

-- ============================================================
-- [복구 블록] public.users 에 row 없을 때만 실행 (트리거 안 돌았을 경우)
-- ============================================================
-- INSERT INTO public.users (id, email, name, status, role, team_id, approved_at)
-- SELECT
--   au.id,
--   au.email,
--   COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
--   'active',
--   'admin',
--   (SELECT id FROM teams WHERE name = '백지운 지점' LIMIT 1),
--   NOW()
-- FROM auth.users au
-- WHERE au.email = 'bohummachine@gmail.com'
-- ON CONFLICT (id) DO UPDATE
--   SET role = 'admin', status = 'active',
--       team_id = EXCLUDED.team_id, approved_at = NOW();
