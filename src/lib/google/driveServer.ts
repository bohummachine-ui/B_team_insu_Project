// Design Ref: team-crm-drive.design.md §2.2 Data Flow step 6-8
// googleapis 기반 Drive API 서버 래퍼 (drive.file scope, 서버 전용)
import { google } from 'googleapis'
import { Readable } from 'stream'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRefreshToken, clearRefreshToken } from './tokenStore'
import { DRIVE_ROOT_FOLDER } from '@/types/drive'

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export class DriveAuthError extends Error {
  constructor(public code: 'no_refresh_token' | 'token_expired') {
    super(code)
  }
}

export class DriveQuotaError extends Error {
  constructor() {
    super('quota_exceeded')
  }
}

/**
 * refresh_token으로 access_token 획득.
 * Design §7: 서버 메모리 only, 응답에 포함 X.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const refreshToken = await getRefreshToken(userId)
  if (!refreshToken) throw new DriveAuthError('no_refresh_token')

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    // 400 invalid_grant → refresh_token 만료/취소
    if (res.status === 400) {
      await clearRefreshToken(userId)
      throw new DriveAuthError('token_expired')
    }
    throw new Error(`oauth_refresh_failed_${res.status}`)
  }

  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

function driveClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

/**
 * `{DRIVE_ROOT_FOLDER}/{customerName}/` 폴더를 찾거나 생성.
 * drive.file scope — 앱이 만든 폴더만 보임 → 항상 우리 앱 네임스페이스에서 동작.
 * Supabase drive_folder_cache에 캐시.
 */
export async function ensureCustomerFolder(
  accessToken: string,
  userId: string,
  customerName: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any

  // 캐시 조회
  const { data: cached } = await supabase
    .from('drive_folder_cache')
    .select('folder_id')
    .eq('user_id', userId)
    .eq('customer_name', customerName)
    .single()
  if (cached?.folder_id) return cached.folder_id as string

  const drive = driveClient(accessToken)

  // 1. 루트 폴더 확보
  const rootId = await findOrCreateFolder(drive, DRIVE_ROOT_FOLDER, 'root')

  // 2. 고객 폴더 확보
  const customerFolderId = await findOrCreateFolder(drive, customerName, rootId)

  // 3. 캐시 저장
  await supabase
    .from('drive_folder_cache')
    .insert({ user_id: userId, customer_name: customerName, folder_id: customerFolderId })

  return customerFolderId
}

async function findOrCreateFolder(
  drive: ReturnType<typeof driveClient>,
  name: string,
  parentId: string
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'")
  const q = [
    `name = '${safeName}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${parentId}' in parents`,
    `trashed = false`,
  ].join(' and ')

  const list = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  })

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id!
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId === 'root' ? undefined : [parentId],
    },
    fields: 'id',
  })

  return created.data.id!
}

export interface UploadFileInput {
  accessToken: string
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface UploadFileResult {
  fileId: string
  webViewLink: string
}

/**
 * Drive에 multipart upload.
 * Retries: 5xx 3회 (1s/3s/9s backoff).
 */
export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const { accessToken, folderId, fileName, mimeType, buffer } = input
  const drive = driveClient(accessToken)

  const delays = [1000, 3000, 9000]
  let lastError: unknown

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: Readable.from(buffer),
        },
        fields: 'id, webViewLink',
      })

      const fileId = res.data.id!

      // D안: anyone-with-link reader 권한 부여.
      // 이유: Drive preview 페이지는 파일이 공개가 아니면 frame-ancestors CSP로 외부 iframe을 차단한다.
      // 링크는 DB에만 저장되고 UI에는 노출되지 않으므로 실질 접근은 앱 인증된 팀원으로 제한된다.
      // 권한 부여 실패는 업로드 자체를 실패시키지 않는다(로그만 남김).
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          // supportsAllDrives: false (개인 Drive만 사용 중)
        })
      } catch (permErr) {
        console.warn('[driveServer] permissions.create failed (iframe preview may not work)', permErr)
      }

      return {
        fileId,
        webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
      }
    } catch (err: unknown) {
      lastError = err
      const status = (err as { code?: number; response?: { status?: number } })?.code
        ?? (err as { response?: { status?: number } })?.response?.status
        ?? 0

      // quota → 즉시 실패
      if (status === 403) {
        const message = (err as { message?: string })?.message ?? ''
        if (/quota|storageQuota/i.test(message)) throw new DriveQuotaError()
      }

      // 5xx만 재시도
      if (status >= 500 && attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]))
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error('upload_failed')
}
