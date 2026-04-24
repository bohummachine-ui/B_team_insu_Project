// Design Ref: §5.2-5.4 — 녹취록 카드 (상태 badge + 재생/텍스트 보기/재시도)
// Plan SC-1/SC-4: 실시간 STT 상태 표시 + 공유된 녹취록의 transcript 캐시 재사용
'use client'

import { useState } from 'react'
import type { Recording } from '@/types'
import ShareBadge from './ShareBadge'
import TranscriptModal from './TranscriptModal'
import PlaybackModal from './PlaybackModal'
import {
  useRetryTranscribe,
  useTranscribeStatus,
  type TranscriptStatus,
} from '@/features/recordings/hooks/useTranscribe'
import { transcriptErrorMessage } from '@/features/recordings/utils/transcriptError'

interface Props {
  recording: Recording
  onOpen: () => void
  onToggleShared: () => void
  toggleSharedDisabled: boolean
}

export default function RecordingCard({
  recording,
  onOpen,
  onToggleShared,
  toggleSharedDisabled,
}: Props) {
  const initialStatus = recording.transcript_status as TranscriptStatus

  const { data: statusData } = useTranscribeStatus({
    recordingId: recording.id,
    initialStatus,
  })

  const status: TranscriptStatus = statusData?.status ?? initialStatus
  const transcript = statusData?.transcript ?? recording.transcript
  const model = statusData?.model ?? recording.transcript_model
  const transcribedAt = statusData?.transcribedAt ?? recording.transcribed_at
  const errorCode = statusData?.error ?? recording.transcript_error

  const retry = useRetryTranscribe()
  const [showTranscript, setShowTranscript] = useState(false)
  const [showPlayback, setShowPlayback] = useState(false)

  const canPlay = !!recording.drive_file_id
  const canViewTranscript = status === 'done' && !!transcript
  const canRetry = status === 'failed'

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex-1 text-left">
          <h3 className="font-bold text-gray-900">🎙️ {recording.title}</h3>
          <div className="text-xs text-gray-500 mt-1">
            {recording.duration
              ? `${Math.floor(recording.duration / 60)}분 ${recording.duration % 60}초`
              : '길이 미지정'}
          </div>
        </button>
        <ShareBadge
          isShared={recording.is_shared}
          onToggle={onToggleShared}
          disabled={toggleSharedDisabled}
        />
      </div>

      <StatusBadge status={status} errorCode={errorCode} />

      <div className="flex flex-wrap gap-2 mt-2">
        {canPlay && (
          <button
            onClick={() => setShowPlayback(true)}
            className="text-xs px-3 py-1 rounded-toss border border-gray-200 hover:bg-gray-50"
          >
            ▶ 재생
          </button>
        )}
        {canViewTranscript && (
          <button
            onClick={() => setShowTranscript(true)}
            className="text-xs px-3 py-1 rounded-toss border border-primary text-primary hover:bg-primary/5"
            data-testid={`view-transcript-${recording.id}`}
          >
            📄 텍스트 보기
          </button>
        )}
        {canRetry && (
          <button
            onClick={() => retry.mutate(recording.id)}
            disabled={retry.isPending}
            className="text-xs px-3 py-1 rounded-toss border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            data-testid={`retry-transcribe-${recording.id}`}
          >
            {retry.isPending ? '재시도 중...' : '🔄 STT 재시도'}
          </button>
        )}
      </div>

      {showTranscript && transcript && (
        <TranscriptModal
          title={recording.title}
          transcript={transcript}
          model={model}
          transcribedAt={transcribedAt}
          onClose={() => setShowTranscript(false)}
        />
      )}

      {showPlayback && recording.drive_file_id && (
        <PlaybackModal
          title={recording.title}
          driveFileId={recording.drive_file_id}
          onClose={() => setShowPlayback(false)}
        />
      )}
    </div>
  )
}

function StatusBadge({
  status,
  errorCode,
}: {
  status: TranscriptStatus
  errorCode: string | null | undefined
}) {
  if (status === 'pending') {
    return <div className="text-xs text-gray-500 mt-2">⏳ STT 대기 중...</div>
  }
  if (status === 'processing') {
    return <div className="text-xs text-blue-600 mt-2">🔄 변환 중 (최대 3분)</div>
  }
  if (status === 'done') {
    return <div className="text-xs text-green-600 mt-2">✅ STT 완료</div>
  }
  if (status === 'failed') {
    return (
      <div className="text-xs text-red-600 mt-2">
        ⚠️ {transcriptErrorMessage(errorCode)}
      </div>
    )
  }
  return null
}
