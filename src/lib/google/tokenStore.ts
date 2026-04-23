// Design Ref: team-crm-drive.design.md §7 — refresh_token server-only access
// Plan SC-1: users.google_refresh_token 저장/조회/삭제
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * 현재 세션 사용자의 google_refresh_token 조회.
 * 없으면 null 반환 → 재로그인 배너 트리거.
 */
export async function getRefreshToken(userId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any
  const { data, error } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return (data.google_refresh_token as string | null) ?? null
}

/**
 * OAuth callback에서 provider_refresh_token 저장.
 */
export async function saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any
  await supabase
    .from('users')
    .update({ google_refresh_token: refreshToken })
    .eq('id', userId)
}

/**
 * refresh_token 만료 시 NULL 처리 → 재로그인 유도.
 */
export async function clearRefreshToken(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any
  await supabase
    .from('users')
    .update({ google_refresh_token: null })
    .eq('id', userId)
}

/**
 * 현재 세션 userId를 얻고 google_refresh_token 존재 여부 체크 (클라이언트 가드용).
 */
export async function hasRefreshToken(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const token = await getRefreshToken(session.user.id)
  return !!token
}
