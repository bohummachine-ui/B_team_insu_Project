// Design Ref: team-crm-drive.design.md §4.2 — 서버 프록시 multipart 업로드
// Plan SC-2: Drive 자동 업로드 / SC-3: recordings 테이블 자동 저장 / SC-5: 50MB 서버 재검증
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import {
  DriveAuthError,
  DriveQuotaError,
  ensureCustomerFolder,
  getAccessToken,
  uploadFile,
} from '@/lib/google/driveServer'
import { MAX_UPLOAD_BYTES, type DriveUploadError, type DriveUploadResult } from '@/types/drive'

export const runtime = 'nodejs'
export const maxDuration = 60

function jsonError(code: DriveUploadError['error'], message: string, status: number) {
  return NextResponse.json<DriveUploadError>({ error: code, message }, { status })
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return jsonError('unauthorized', '로그인이 필요합니다', 401)

  const userId = session.user.id

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('bad_request', 'multipart 폼이 아닙니다', 400)

  const file = form.get('file')
  const customerId = form.get('customerId')
  const customerName = form.get('customerName')

  if (!(file instanceof File)) return jsonError('bad_request', 'file 필드 필요', 400)
  if (typeof customerId !== 'string' || !customerId) {
    return jsonError('bad_request', 'customerId 필드 필요', 400)
  }
  if (typeof customerName !== 'string' || !customerName.trim()) {
    return jsonError('bad_request', 'customerName 필드 필요', 400)
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError('file_too_large', '50MB 이하의 파일만 업로드 가능합니다', 413)
  }

  try {
    const accessToken = await getAccessToken(userId)
    const folderId = await ensureCustomerFolder(accessToken, userId, customerName.trim())

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'

    const uploaded = await uploadFile({
      accessToken,
      folderId,
      fileName: file.name,
      mimeType,
      buffer,
    })

    // recordings INSERT (admin client — RLS 우회하여 파일 메타 기록)
    const admin = createAdminSupabaseClient()
    const { data: inserted, error: insertError } = await admin
      .from('recordings')
      // @ts-expect-error — 마이그레이션 후 타입 재생성 전 임시
      .insert({
        owner_user_id: userId,
        customer_id: customerId,
        title: file.name,
        drive_file_id: uploaded.fileId,
        drive_web_view_link: uploaded.webViewLink,
        file_name: file.name,
        mime_type: mimeType,
        size_bytes: file.size,
        consent_confirmed: true,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[drive/upload] recordings insert failed', insertError)
      return jsonError('upload_failed', 'DB 저장 실패', 500)
    }

    const result: DriveUploadResult = {
      recordingId: (inserted as { id: string }).id,
      driveFileId: uploaded.fileId,
      webViewLink: uploaded.webViewLink,
      fileName: file.name,
      sizeBytes: file.size,
    }

    console.info('[drive/upload] success', { userId, recordingId: result.recordingId })
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof DriveAuthError) {
      if (err.code === 'no_refresh_token') {
        return jsonError('no_refresh_token', 'Google 재로그인이 필요합니다', 403)
      }
      return jsonError('token_expired', '인증이 만료되어 재로그인 필요', 403)
    }
    if (err instanceof DriveQuotaError) {
      return jsonError('quota_exceeded', 'Drive 저장 공간이 부족합니다', 507)
    }
    console.error('[drive/upload] unexpected', err)
    return jsonError('upload_failed', '업로드에 실패했습니다. 다시 시도해주세요', 500)
  }
}
