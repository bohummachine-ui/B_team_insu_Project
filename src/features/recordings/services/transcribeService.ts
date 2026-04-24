// Design Ref: §4.4 — transcribe 오케스트레이션 (Vault → Drive → Gemini → DB)
// Plan SC-1/SC-2/SC-3/SC-5: 전 과정 서버 전용, 평문 키/파일 노출 금지
import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getUserGeminiKey } from '@/features/auth/services/vaultServerService'
import { getAccessToken, DriveAuthError } from '@/lib/google/driveServer'
import {
  GEMINI_STT_MODEL,
  MAX_STT_BYTES,
  SttError,
  transcribeAudio,
} from './geminiStt'

export type TranscribeResultCode =
  | 'done'
  | 'already_processing'
  | 'no_api_key'
  | 'file_too_large'
  | 'rate_limited'
  | 'invalid_audio'
  | 'invalid_key'
  | 'drive_fetch_failed'
  | 'not_found'
  | 'forbidden'
  | 'stt_failed'

export interface TranscribeResult {
  code: TranscribeResultCode
  httpStatus: number
  transcript?: string
  error?: string
}

interface RecordingRow {
  id: string
  owner_user_id: string
  drive_file_id: string | null
  transcript_status: 'pending' | 'processing' | 'done' | 'failed'
}

export async function runTranscribe(
  recordingId: string,
  callerUserId: string
): Promise<TranscribeResult> {
  const admin = createAdminSupabaseClient()

  // 1. recording 조회 + 권한 확인
  const { data: rec, error: fetchErr } = await admin
    .from('recordings')
    .select('id, owner_user_id, drive_file_id, transcript_status')
    .eq('id', recordingId)
    .maybeSingle<RecordingRow>()

  if (fetchErr || !rec) {
    return { code: 'not_found', httpStatus: 404, error: 'not_found' }
  }
  if (rec.owner_user_id !== callerUserId) {
    return { code: 'forbidden', httpStatus: 403, error: 'forbidden' }
  }
  if (!rec.drive_file_id) {
    return fail(admin, recordingId, 'drive_fetch_failed', 400)
  }

  // 2. idempotency: 이미 processing이면 409
  if (rec.transcript_status === 'processing') {
    return { code: 'already_processing', httpStatus: 409, error: 'already_processing' }
  }

  // 3. processing으로 전환 (동시 호출 방어: status 체크 포함 UPDATE)
  const { error: lockErr, count } = await admin
    .from('recordings')
    .update(
      {
        transcript_status: 'processing',
        transcript_error: null,
      },
      { count: 'exact' }
    )
    .eq('id', recordingId)
    .in('transcript_status', ['pending', 'failed', 'done'])

  if (lockErr) {
    console.error('[transcribe] lock failed', lockErr)
    return fail(admin, recordingId, 'stt_failed', 500, lockErr.message)
  }
  if (!count) {
    // 다른 동시 요청이 먼저 processing으로 바꾼 경우
    return { code: 'already_processing', httpStatus: 409, error: 'already_processing' }
  }

  try {
    // 4. Vault에서 키 조회 (service_role only)
    const apiKey = await getUserGeminiKey(rec.owner_user_id)
    if (!apiKey) {
      return fail(admin, recordingId, 'no_api_key', 400)
    }

    // 5. Drive 파일 스트리밍 (업로더의 refresh_token으로)
    const buffer = await fetchDriveFile(rec.owner_user_id, rec.drive_file_id)
    if (buffer.byteLength > MAX_STT_BYTES) {
      return fail(admin, recordingId, 'file_too_large', 400)
    }

    // 6. Gemini STT 실행
    const transcript = await transcribeAudio(buffer, apiKey, guessMimeFromFileId())

    // 7. 성공 기록
    const { error: updateErr } = await admin
      .from('recordings')
      .update({
        transcript,
        transcript_status: 'done',
        transcript_model: GEMINI_STT_MODEL,
        transcript_error: null,
        transcribed_at: new Date().toISOString(),
      })
      .eq('id', recordingId)

    if (updateErr) {
      console.error('[transcribe] success update failed', updateErr)
      return fail(admin, recordingId, 'stt_failed', 500, updateErr.message)
    }

    return { code: 'done', httpStatus: 200, transcript }
  } catch (err: unknown) {
    if (err instanceof SttError) {
      const status = err.code === 'rate_limited' ? 429 : err.code === 'invalid_key' ? 400 : 500
      return fail(admin, recordingId, err.code as TranscribeResultCode, status, err.message)
    }
    if (err instanceof DriveAuthError) {
      return fail(admin, recordingId, 'drive_fetch_failed', 403, err.code)
    }
    if (err instanceof DriveFetchError) {
      return fail(admin, recordingId, 'drive_fetch_failed', 502, err.message)
    }
    const message = (err as { message?: string })?.message ?? 'stt_failed'
    console.error('[transcribe] unexpected', err)
    return fail(admin, recordingId, 'stt_failed', 500, message)
  }
}

async function fail(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  recordingId: string,
  code: TranscribeResultCode,
  httpStatus: number,
  detail?: string
): Promise<TranscribeResult> {
  const errorCode = code === 'done' || code === 'already_processing' ? 'stt_failed' : code
  await admin
    .from('recordings')
    .update({
      transcript_status: 'failed',
      transcript_error: errorCode,
    })
    .eq('id', recordingId)
  return { code, httpStatus, error: detail ?? errorCode }
}

async function fetchDriveFile(ownerUserId: string, driveFileId: string): Promise<Buffer> {
  let accessToken: string
  try {
    accessToken = await getAccessToken(ownerUserId)
  } catch (err) {
    if (err instanceof DriveAuthError) throw err
    throw new DriveFetchError((err as { message?: string })?.message ?? 'drive_auth_failed')
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new DriveFetchError(`drive_fetch_failed_${res.status}`)
  }
  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

function guessMimeFromFileId(): string {
  // Drive 메타에서 mime 조회는 별도 API 호출이 필요해 비용 증가.
  // Gemini가 audio/mpeg로 대부분 인식하므로 기본값 사용. 실패 시 SttError('invalid_audio')로 매핑.
  return 'audio/mpeg'
}

class DriveFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DriveFetchError'
  }
}
