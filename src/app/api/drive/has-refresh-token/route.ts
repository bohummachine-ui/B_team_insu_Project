// Design Ref: team-crm-drive.design.md §5.4 — ReloginBanner 조건 조회
// google_refresh_token 존재 여부만 반환 (값 노출 X)
import { NextResponse } from 'next/server'
import { hasRefreshToken } from '@/lib/google/tokenStore'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ hasToken: false, authenticated: false })
  }
  const exists = await hasRefreshToken()
  return NextResponse.json({ hasToken: exists, authenticated: true })
}
