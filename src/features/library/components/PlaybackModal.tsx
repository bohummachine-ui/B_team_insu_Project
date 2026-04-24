// Design Ref: §5.4 — Drive iframe 재생 모달 (autoplay 금지)
// D안: 모달 오픈 시 Drive 파일 권한을 anyone-with-link reader로 보장 (idempotent backfill).
'use client'

import { useEffect, useState } from 'react'

interface Props {
  recordingId: string
  title: string
  driveFileId: string
  onClose: () => void
}

export default function PlaybackModal({ recordingId, title, driveFileId, onClose }: Props) {
  const [publicReady, setPublicReady] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/preview`
  const openInNewTab = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`

  useEffect(() => {
    // Drive 파일이 비공개면 iframe preview가 CSP로 차단되므로
    // 최초 재생 시 anyone-with-link reader 권한을 확보한다.
    // 이미 공개 상태여도 Drive는 200으로 받아줌(idempotent).
    let cancelled = false
    fetch(`/api/recordings/${recordingId}/share-public`, { method: 'POST' })
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          setPublicReady(true)
        } else {
          const { error } = await res.json().catch(() => ({ error: 'failed' }))
          setShareError(error || `failed_${res.status}`)
        }
      })
      .catch((err) => {
        if (!cancelled) setShareError(String(err))
      })
    return () => { cancelled = true }
  }, [recordingId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-toss w-full max-w-xl overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">🎙️ {title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        <div className="bg-gray-50">
          <iframe
            src={previewUrl}
            title={`${title} 재생`}
            className="w-full h-64"
            allow="encrypted-media"
            referrerPolicy="no-referrer"
          />
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
          <a
            href={openInNewTab}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            새 탭에서 열기 ↗
          </a>
          <button onClick={onClose} className="btn-primary text-sm">
            닫기
          </button>
        </footer>
      </div>
    </div>
  )
}
