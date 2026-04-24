// Design Ref: §4.5 GET status + §4.4 POST retry — polling + 수동 재시도
// Plan SC-1: pending/processing 상태에서만 5초 polling, done/failed는 중단
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface TranscribeStatusDto {
  status: TranscriptStatus
  transcript: string | null
  error: string | null
  model: string | null
  transcribedAt: string | null
}

async function fetchTranscribeStatus(recordingId: string): Promise<TranscribeStatusDto> {
  const res = await fetch(`/api/recordings/${recordingId}/transcribe`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`status_failed_${res.status}`)
  }
  return res.json()
}

async function postTranscribe(recordingId: string): Promise<void> {
  const res = await fetch(`/api/recordings/${recordingId}/transcribe`, {
    method: 'POST',
  })
  if (!res.ok && res.status !== 409) {
    // 409(already_processing)는 정상으로 처리 — 이미 돌고 있음
    const { error } = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(error || `retry_failed_${res.status}`)
  }
}

const KEY = 'transcribe'

interface UseTranscribeStatusArgs {
  recordingId: string
  initialStatus?: TranscriptStatus
  enabled?: boolean
}

export function useTranscribeStatus({
  recordingId,
  initialStatus,
  enabled = true,
}: UseTranscribeStatusArgs) {
  return useQuery<TranscribeStatusDto>({
    queryKey: [KEY, 'status', recordingId],
    queryFn: () => fetchTranscribeStatus(recordingId),
    enabled: enabled && !!recordingId,
    // pending/processing인 동안만 5초 간격 polling
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? initialStatus
      return status === 'pending' || status === 'processing' ? 5000 : false
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  })
}

export function useRetryTranscribe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordingId: string) => postTranscribe(recordingId),
    onSuccess: (_data, recordingId) => {
      qc.invalidateQueries({ queryKey: [KEY, 'status', recordingId] })
      qc.invalidateQueries({ queryKey: ['library-recordings'] })
    },
  })
}
