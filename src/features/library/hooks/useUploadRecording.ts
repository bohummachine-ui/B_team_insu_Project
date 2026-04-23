// Design Ref: team-crm-drive.design.md §5.3 — useUploadRecording (XHR + onprogress)
// Plan SC-4: 진행률 UI 0-100%
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
  progress: number // 0-100
  sentBytes: number
  totalBytes: number
}

const INITIAL_STATE: UploadState = { progress: 0, sentBytes: 0, totalBytes: 0 }

function uploadWithProgress(
  input: UploadInput,
  onProgress: (s: UploadState) => void
): Promise<DriveUploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', input.file)
    form.append('customerId', input.customerId)
    form.append('customerName', input.customerName)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/drive/upload')

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
        const body = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as DriveUploadResult)
        } else {
          reject(body as DriveUploadError)
        }
      } catch {
        reject({ error: 'upload_failed', message: '서버 응답 파싱 실패' } as DriveUploadError)
      }
    })

    xhr.addEventListener('error', () => {
      reject({ error: 'upload_failed', message: '네트워크 오류' } as DriveUploadError)
    })

    xhr.send(form)
  })
}

export function useUploadRecording() {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)
  const qc = useQueryClient()

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  const mutation = useMutation<DriveUploadResult, DriveUploadError, UploadInput>({
    mutationFn: (input) => uploadWithProgress(input, setState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recordings'] })
    },
    onSettled: () => {
      // keep final progress visible briefly before reset via caller
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
