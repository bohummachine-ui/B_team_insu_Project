// Design Ref: recording-stt — Client-direct Drive upload (Vercel 4.5MB 리밋 우회)
// Plan SC-4: 진행률 UI 0-100%
// 흐름:
//   1) POST /api/drive/upload-init → { accessToken, folderId }
//   2) XHR multipart → https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
//   3) POST /api/recordings/register → DB insert + 권한 부여 + STT trigger
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import type { DriveUploadError, DriveUploadResult } from '@/types/drive'

export interface UploadInput {
  file: File
  customerId: string
  customerName: string
}

interface UploadState {
  progress: number
  sentBytes: number
  totalBytes: number
}

const INITIAL_STATE: UploadState = { progress: 0, sentBytes: 0, totalBytes: 0 }

async function initUpload(customerName: string): Promise<{ accessToken: string; folderId: string }> {
  const res = await fetch('/api/drive/upload-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw {
      error: (body.error as DriveUploadError['error']) || 'upload_failed',
      message: body.message || `init_failed_${res.status}`,
    } as DriveUploadError
  }
  return res.json()
}

function uploadDirectToDrive(
  file: File,
  accessToken: string,
  folderId: string,
  onProgress: (s: UploadState) => void
): Promise<{ id: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const boundary = '----bteamcrm' + Math.random().toString(36).slice(2)
    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type || 'application/octet-stream',
    }

    // Drive multipart body: metadata part + file part (binary via Blob concat).
    const encoder = new TextEncoder()
    const head = encoder.encode(
      `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        `Content-Type: ${metadata.mimeType}\r\n\r\n`
    )
    const tail = encoder.encode(`\r\n--${boundary}--`)
    const blob = new Blob([head, file, tail], { type: `multipart/related; boundary=${boundary}` })

    const xhr = new XMLHttpRequest()
    xhr.open(
      'POST',
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,mimeType'
    )
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`)

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return
      onProgress({
        progress: Math.round((e.loaded / e.total) * 100),
        sentBytes: e.loaded,
        totalBytes: e.total,
      })
    })

    xhr.addEventListener('load', () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const body = JSON.parse(xhr.responseText || '{}')
          resolve({ id: body.id, mimeType: body.mimeType || metadata.mimeType })
        } else {
          reject({ error: 'upload_failed', message: `drive_${xhr.status}` } as DriveUploadError)
        }
      } catch {
        reject({ error: 'upload_failed', message: 'parse_failed' } as DriveUploadError)
      }
    })
    xhr.addEventListener('error', () => {
      reject({ error: 'upload_failed', message: '네트워크 오류' } as DriveUploadError)
    })
    xhr.send(blob)
  })
}

async function registerRecording(params: {
  driveFileId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  customerId: string
  customerName: string
}): Promise<DriveUploadResult> {
  const res = await fetch('/api/recordings/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, consentConfirmed: true }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw {
      error: (body.error as DriveUploadError['error']) || 'upload_failed',
      message: body.message || `register_failed_${res.status}`,
    } as DriveUploadError
  }
  return res.json()
}

async function runUpload(
  input: UploadInput,
  setState: (s: UploadState) => void
): Promise<DriveUploadResult> {
  setState({ progress: 0, sentBytes: 0, totalBytes: input.file.size })
  const { accessToken, folderId } = await initUpload(input.customerName)
  const uploaded = await uploadDirectToDrive(input.file, accessToken, folderId, setState)
  return registerRecording({
    driveFileId: uploaded.id,
    fileName: input.file.name,
    mimeType: uploaded.mimeType,
    sizeBytes: input.file.size,
    customerId: input.customerId,
    customerName: input.customerName,
  })
}

export function useUploadRecording() {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)
  const qc = useQueryClient()

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  const mutation = useMutation<DriveUploadResult, DriveUploadError, UploadInput>({
    mutationFn: (input) => runUpload(input, setState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recordings'] })
      qc.invalidateQueries({ queryKey: ['library-recordings'] })
    },
  })

  return {
    upload: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    progress: state.progress,
    sentBytes: state.sentBytes,
    totalBytes: state.totalBytes,
    reset,
  }
}
