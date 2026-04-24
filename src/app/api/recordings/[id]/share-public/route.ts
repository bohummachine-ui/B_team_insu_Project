// Design Ref: recording-stt D안 — Drive 파일 iframe preview를 위한 anyone-with-link reader 권한 부여.
// 기존에 업로드된 파일들이 비공개 상태라 iframe이 CSP frame-ancestors로 차단되는 문제 해결용.
// 본인 소유 녹취록에 한해서만 호출 가능.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/google/driveServer'
import { google } from 'googleapis'

export const runtime = 'nodejs'

interface RouteCtx { params: { id: string } }

export async function POST(_req: Request, { params }: RouteCtx) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()
  const { data: rec, error } = await admin
    .from('recordings')
    .select('id, owner_user_id, drive_file_id')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !rec) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (rec.owner_user_id !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!rec.drive_file_id) {
    return NextResponse.json({ error: 'no_drive_file' }, { status: 400 })
  }

  try {
    const accessToken = await getAccessToken(rec.owner_user_id)
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth })

    await drive.permissions.create({
      fileId: rec.drive_file_id,
      requestBody: { role: 'reader', type: 'anyone' },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = (err as { message?: string })?.message ?? 'failed'
    console.error('[share-public] failed', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
