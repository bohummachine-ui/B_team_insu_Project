// Design Ref: recording-stt — Client-direct Drive upload 완료 후 서버에 메타 등록.
// 처리: (1) 파일 존재 확인 + (2) anyone-with-link reader 권한 부여 + (3) recordings INSERT + (4) STT fire-and-forget.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { DriveAuthError, getAccessToken } from '@/lib/google/driveServer'
import { google } from 'googleapis'

export const runtime = 'nodejs'

interface Body {
  driveFileId?: unknown
  fileName?: unknown
  mimeType?: unknown
  sizeBytes?: unknown
  customerId?: unknown
  customerName?: unknown
  consentConfirmed?: unknown
}

function triggerTranscribe(req: Request, recordingId: string): void {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(req.url).origin
  const url = `${origin}/api/recordings/${recordingId}/transcribe`
  const cookie = req.headers.get('cookie') ?? ''
  fetch(url, {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  }).catch((err) => console.warn('[recordings/register] transcribe trigger failed', err))
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const driveFileId = typeof body.driveFileId === 'string' ? body.driveFileId : ''
  const fileName = typeof body.fileName === 'string' ? body.fileName : ''
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'application/octet-stream'
  const sizeBytes = typeof body.sizeBytes === 'number' ? body.sizeBytes : 0
  const customerId = typeof body.customerId === 'string' ? body.customerId : ''
  const consent = body.consentConfirmed === true

  if (!driveFileId || !fileName || !customerId || !consent) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    // 1. 파일 존재 확인 (소유권은 OAuth scope에서 이미 보장됨 — 업로더의 토큰으로만 업로드 가능)
    const accessToken = await getAccessToken(userId)
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth })

    const meta = await drive.files.get({
      fileId: driveFileId,
      fields: 'id, webViewLink, size, mimeType',
    })
    const webViewLink =
      meta.data.webViewLink ?? `https://drive.google.com/file/d/${driveFileId}/view`

    // 2. anyone-with-link reader 권한 (iframe preview CSP 우회)
    try {
      await drive.permissions.create({
        fileId: driveFileId,
        requestBody: { role: 'reader', type: 'anyone' },
      })
    } catch (permErr) {
      console.warn('[recordings/register] permissions.create failed', permErr)
    }

    // 3. recordings INSERT
    const admin = createAdminSupabaseClient()
    const { data: inserted, error: insertError } = await admin
      .from('recordings')
      // @ts-expect-error — 마이그레이션 후 타입 재생성 전 임시 (drive_integration 필드)
      .insert({
        owner_user_id: userId,
        customer_id: customerId,
        title: fileName,
        drive_file_id: driveFileId,
        drive_web_view_link: webViewLink,
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        consent_confirmed: true,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[recordings/register] insert failed', insertError)
      return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 })
    }

    const recordingId = (inserted as { id: string }).id

    // 4. STT fire-and-forget
    triggerTranscribe(req, recordingId)

    return NextResponse.json({
      recordingId,
      driveFileId,
      webViewLink,
      fileName,
      sizeBytes,
    })
  } catch (err) {
    if (err instanceof DriveAuthError) {
      const code = err.code === 'no_refresh_token' ? 'no_refresh_token' : 'token_expired'
      return NextResponse.json({ error: code }, { status: 403 })
    }
    console.error('[recordings/register] unexpected', err)
    return NextResponse.json({ error: 'register_failed' }, { status: 500 })
  }
}
