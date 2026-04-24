// Design Ref: §5.3 — 텍스트 보기 모달 (읽기 전용, 복사 지원)
'use client'

import { useState } from 'react'

interface Props {
  title: string
  transcript: string
  model: string | null
  transcribedAt: string | null
  onClose: () => void
}

export default function TranscriptModal({
  title,
  transcript,
  model,
  transcribedAt,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const dateLabel = transcribedAt
    ? new Date(transcribedAt).toLocaleString('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-toss w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">📄 {title}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {model ?? 'Gemini'} · {dateLabel} 변환
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-sans">
            {transcript}
          </pre>
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary text-sm"
            data-testid="transcript-copy"
          >
            {copied ? '✅ 복사됨' : '📋 복사'}
          </button>
          <button onClick={onClose} className="btn-primary text-sm">
            닫기
          </button>
        </footer>
      </div>
    </div>
  )
}
