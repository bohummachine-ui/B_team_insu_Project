// Design Ref: team-crm-drive.design.md §5.1-5.4 — RecordingPanel 파일 업로드 + 진행률
// Plan SC-2/SC-4: Drive 자동 업로드 + 0-100% 진행률
'use client'

import { useRef, useState } from 'react'
import {
  useRecordings,
  useCreateRecording,
  useUpdateRecording,
  useDeleteRecording,
  useSetRecordingShared,
} from '../hooks/useRecordings'
import { useUploadRecording } from '../hooks/useUploadRecording'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import type { Recording } from '@/types'
import type { DriveUploadError } from '@/types/drive'
import { MAX_UPLOAD_BYTES } from '@/types/drive'
import RecordingCard from './RecordingCard'
import ReloginBanner from '@/components/auth/ReloginBanner'
import Toast from '@/features/panel/components/Toast'
import { useCopyToast } from '@/features/panel/hooks/useCopyToast'

const MB = 1024 * 1024

function formatMB(bytes: number): string {
  return (bytes / MB).toFixed(1)
}

function errorMessage(err: DriveUploadError | Error | null): string {
  if (!err) return '업로드 실패'
  if (err instanceof Error) return err.message
  switch (err.error) {
    case 'unauthorized':
      return '로그인이 만료되었습니다'
    case 'no_refresh_token':
      return 'Drive 기능을 위해 Google 재로그인이 필요합니다'
    case 'token_expired':
      return '인증이 만료되어 재로그인이 필요합니다'
    case 'file_too_large':
      return '50MB 이하의 파일만 업로드 가능합니다'
    case 'quota_exceeded':
      return 'Drive 저장 공간이 부족합니다'
    case 'bad_request':
      return err.message || '잘못된 요청입니다'
    default:
      return '업로드에 실패했습니다. 다시 시도해주세요'
  }
}

export default function RecordingPanel() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Recording | null>(null)
  const [creating, setCreating] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
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
      <ReloginBanner />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="녹취록 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="btn-primary whitespace-nowrap"
        >
          {showUpload ? '업로드 닫기' : '📁 파일 업로드'}
        </button>
        <button onClick={() => setCreating(true)} className="btn-secondary whitespace-nowrap">
          + 수동 등록
        </button>
      </div>

      {showUpload && <UploadForm onDone={() => setShowUpload(false)} />}

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">
          아직 업로드된 녹음본이 없습니다
        </div>
      )}

      <div className="space-y-2">
        {data?.map((r) => (
          <RecordingCard
            key={r.id}
            recording={r}
            onOpen={() => setEditing(r)}
            onToggleShared={() => setShared.mutate({ id: r.id, isShared: !r.is_shared })}
            toggleSharedDisabled={setShared.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [customerId, setCustomerId] = useState<string>('')
  const [consent, setConsent] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: contacts = [] } = useContacts({})
  const { upload, isUploading, progress, sentBytes, totalBytes, reset } = useUploadRecording()
  const toast = useCopyToast()

  const selectedContact = contacts.find((c) => c.id === customerId)
  const tooLarge = !!file && file.size > MAX_UPLOAD_BYTES

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null)
      return
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      toast.show('50MB 이하의 파일만 업로드 가능합니다', true)
    }
    setFile(f)
  }

  const canUpload =
    !!file && !tooLarge && !!customerId && !!selectedContact && consent && !isUploading

  const handleUpload = async () => {
    if (!canUpload || !file || !selectedContact) return
    try {
      await upload({
        file,
        customerId: selectedContact.id,
        customerName: selectedContact.name,
      })
      toast.show(`업로드 완료: ${file.name}`)
      setFile(null)
      setCustomerId('')
      setConsent(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      reset()
      setTimeout(onDone, 800)
    } catch (err) {
      toast.show(errorMessage(err as DriveUploadError), true)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="text-sm font-semibold text-gray-900">📁 녹음본 업로드</div>

      <label className="block">
        <span className="text-sm text-gray-600">고객 선택 *</span>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={isUploading}
          className="input mt-1 w-full"
        >
          <option value="">-- 고객을 선택하세요 --</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">
          녹음 파일 (audio/*, 최대 {MAX_UPLOAD_BYTES / MB}MB)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          disabled={isUploading}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="input mt-1 w-full"
        />
      </label>

      {file && (
        <div className={`text-xs ${tooLarge ? 'text-red-600' : 'text-gray-600'}`}>
          {file.name} ({formatMB(file.size)} MB)
          {tooLarge && ' — 50MB 초과'}
        </div>
      )}

      {isUploading && (
        <div className="space-y-1">
          <div className="w-full bg-gray-100 rounded-toss h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-150"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
            />
          </div>
          <div className="text-xs text-gray-500 text-right">
            {progress}% ({formatMB(sentBytes)} / {formatMB(totalBytes)} MB)
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 cursor-pointer p-3 bg-red-50 border border-red-200 rounded-toss">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={isUploading}
          className="w-4 h-4 mt-0.5"
        />
        <span className="text-sm text-gray-800">
          고객의 녹음 동의를 받았으며, 본 파일이 텍스트 변환을 위해 Google Gemini API로 전송됨에 동의합니다. *
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onDone} disabled={isUploading} className="btn-secondary">
          취소
        </button>
        <div className="flex-1" />
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className="btn-primary"
          data-testid="upload-submit"
        >
          {isUploading ? `업로드 중 ${progress}%` : '업로드'}
        </button>
      </div>

      <Toast message={toast.message} isError={toast.isError} />
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
            고객의 녹음 동의를 받았으며, 본 파일이 텍스트 변환을 위해 Google Gemini API로 전송됨에 동의합니다. *
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
