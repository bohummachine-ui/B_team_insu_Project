'use client'

import { useState } from 'react'
import {
  useRecordings,
  useCreateRecording,
  useUpdateRecording,
  useDeleteRecording,
  useSetRecordingShared,
} from '../hooks/useRecordings'
import type { Recording } from '@/types'
import ShareBadge from './ShareBadge'

export default function RecordingPanel() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recording | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useRecordings({ search: search || undefined })
  const setShared = useSetRecordingShared()

  if (editing || creating) {
    return (
      <RecordingForm
        recording={editing ?? undefined}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-toss">
        ⚠️ 녹취 파일 업로드는 Google Drive 연동이 필요합니다. 현재는 메타데이터(제목, 길이, 공유
        링크)만 기록할 수 있습니다.
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="녹취록 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 녹취록
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">녹취록이 없습니다</div>
      )}

      <div className="space-y-2">
        {data?.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setEditing(r)} className="flex-1 text-left">
                <h3 className="font-bold text-gray-900">🎙️ {r.title}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  {r.duration ? `${Math.floor(r.duration / 60)}분 ${r.duration % 60}초` : '길이 미지정'}
                  {r.drive_share_link && (
                    <span className="ml-2 text-primary">• Drive 링크 있음</span>
                  )}
                </div>
              </button>
              <ShareBadge
                isShared={r.is_shared}
                onToggle={() => setShared.mutate({ id: r.id, isShared: !r.is_shared })}
                disabled={setShared.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecordingForm({
  recording,
  onClose,
}: {
  recording?: Recording
  onClose: () => void
}) {
  const [title, setTitle] = useState(recording?.title ?? '')
  const [duration, setDuration] = useState(recording?.duration?.toString() ?? '')
  const [driveLink, setDriveLink] = useState(recording?.drive_share_link ?? '')
  const [driveFileId, setDriveFileId] = useState(recording?.drive_file_id ?? '')
  const [consent, setConsent] = useState(recording?.consent_confirmed ?? false)
  const [isShared, setIsShared] = useState(recording?.is_shared ?? false)
  const create = useCreateRecording()
  const update = useUpdateRecording()
  const del = useDeleteRecording()

  const submit = async () => {
    if (!title.trim() || !consent) return
    const payload = {
      title,
      duration: duration ? Number(duration) : null,
      drive_share_link: driveLink || null,
      drive_file_id: driveFileId || null,
      consent_confirmed: consent,
      is_shared: isShared,
    }
    if (recording) {
      await update.mutateAsync({ id: recording.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const remove = async () => {
    if (!recording) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    await del.mutateAsync(recording.id)
    onClose()
  }

  const busy = create.isPending || update.isPending || del.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold flex-1">{recording ? '녹취록 수정' : '새 녹취록'}</h2>
      </div>

      <div className="card space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">제목 *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">길이 (초)</span>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Google Drive 공유 링크 (선택)</span>
          <input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Drive File ID (선택)</span>
          <input
            type="text"
            value={driveFileId}
            onChange={(e) => setDriveFileId(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>

        <label className="flex items-start gap-2 cursor-pointer p-3 bg-red-50 border border-red-200 rounded-toss">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-4 h-4 mt-0.5"
          />
          <span className="text-sm text-gray-800">
            고객의 녹음 동의를 받았음을 확인합니다. *
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">팀에 공유</span>
        </label>

        <div className="flex gap-2 pt-2">
          {recording && (
            <button onClick={remove} disabled={busy} className="btn-secondary text-red-500">
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={busy} className="btn-secondary">
            취소
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim() || !consent}
            className="btn-primary"
          >
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
