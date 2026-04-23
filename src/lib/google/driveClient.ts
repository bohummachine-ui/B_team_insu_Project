// Design Ref: §4 Drive API / FR-13 — Google Drive 업로드 클라이언트 (v1.1 full impl 예정)
// TODO(v1.1): OAuth scope=drive.file, access_token refresh, resumable upload, quota handling.

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
  name: string
}

export async function uploadToDrive(file: File): Promise<DriveUploadResult> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/drive/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'upload_failed' }))
    throw new Error(err.error ?? 'upload_failed')
  }
  return res.json()
}

export function extractDriveIdFromUrl(url: string): string | null {
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}
