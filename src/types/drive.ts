// Design Ref: team-crm-drive.design.md §3.2 — Drive 업로드 도메인 타입

export interface DriveUploadResult {
  recordingId: string
  driveFileId: string
  webViewLink: string
  fileName: string
  sizeBytes: number
}

export type DriveUploadErrorCode =
  | 'unauthorized'
  | 'no_refresh_token'
  | 'file_too_large'
  | 'quota_exceeded'
  | 'token_expired'
  | 'upload_failed'
  | 'bad_request'

export interface DriveUploadError {
  error: DriveUploadErrorCode
  message: string
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50MB
export const DRIVE_ROOT_FOLDER = '백지운CRM'
