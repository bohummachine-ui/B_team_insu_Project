// Design Ref: §4.1 GET /api/profile/gemini-key/status
// Plan SC-2: 평문 키는 절대 노출하지 않고, 등록 여부(boolean)만 반환.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('has_user_gemini_key')
  if (error) {
    console.error('[GET /api/profile/gemini-key/status] rpc failed', error)
    return NextResponse.json({ error: 'rpc_failed' }, { status: 500 })
  }

  return NextResponse.json({ hasKey: Boolean(data) })
}
