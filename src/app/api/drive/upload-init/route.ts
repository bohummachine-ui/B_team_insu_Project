// Design Ref: recording-stt — Client-direct Drive upload init.
// Vercel 서버리스 함수 본문 4.5MB 리밋을 우회하려면 클라이언트가 Drive로 직접 multipart 업로드를 해야 한다.
// 이 엔드포인트는 짧은 유효기간(≈1h) access_token + 대상 폴더 ID 만 반환한다.
// scope는 drive.file(OAuth 설정)이므로 유출되어도 사용자의 다른 파일엔 접근 불가.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DriveAuthError, ensureCustomerFolder, getAccessToken } from '@/lib/google/driveServer'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { customerName?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : ''
  if (!customerName) {
    return NextResponse.json({ error: 'customer_name_required' }, { status: 400 })
  }

  try {
    const accessToken = await getAccessToken(session.user.id)
    const folderId = await ensureCustomerFolder(accessToken, session.user.id, customerName)
    return NextResponse.json({ accessToken, folderId })
  } catch (err) {
    if (err instanceof DriveAuthError) {
      const code = err.code === 'no_refresh_token' ? 'no_refresh_token' : 'token_expired'
      return NextResponse.json({ error: code }, { status: 403 })
    }
    console.error('[drive/upload-init] failed', err)
    return NextResponse.json({ error: 'init_failed' }, { status: 500 })
  }
}
