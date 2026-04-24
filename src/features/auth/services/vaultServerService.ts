// Design Ref: §11.1 — 서버 전용 Vault 조회 헬퍼
// Plan SC-2: get_user_gemini_key는 service_role 권한으로만 호출 가능.
// 반드시 API route (예: transcribe) 서버 핸들러에서만 사용할 것.
import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function getUserGeminiKey(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.rpc('get_user_gemini_key', { p_user_id: userId })
  if (error) {
    console.error('[vaultServerService] get_user_gemini_key failed', error)
    return null
  }
  return (data as string | null) ?? null
}
