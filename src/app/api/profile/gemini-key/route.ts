// Design Ref: §4.1 POST /api/profile/gemini-key, DELETE /api/profile/gemini-key
// Plan SC-2: 평문 키는 서버에서 RPC(set_user_gemini_key)로 Vault에 즉시 전달, 응답 바디에 포함하지 않음.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { key?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!key || key.length < 20 || key.length > 200) {
    return NextResponse.json({ error: 'invalid_key_format' }, { status: 400 })
  }

  const { error } = await supabase.rpc('set_user_gemini_key', { p_key: key })
  if (error) {
    console.error('[POST /api/profile/gemini-key] rpc failed', error)
    const code = error.code === '22023' ? 400 : 500
    return NextResponse.json({ error: error.message || 'rpc_failed' }, { status: code })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.rpc('delete_user_gemini_key')
  if (error) {
    console.error('[DELETE /api/profile/gemini-key] rpc failed', error)
    return NextResponse.json({ error: error.message || 'rpc_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
