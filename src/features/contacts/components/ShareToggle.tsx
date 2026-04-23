'use client'

import { useState } from 'react'
import { useContactShare } from '../hooks/useContactShare'
import MaskingPreview from './MaskingPreview'
import type { Contact } from '@/types'

interface Props {
  contact: Contact
}

export default function ShareToggle({ contact }: Props) {
  const share = useContactShare()
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleToggle = async () => {
    if (!contact.is_shared) {
      setShowConfirm(true)
    } else {
      await share.mutateAsync({ id: contact.id, isShared: false })
    }
  }

  const confirmShare = async () => {
    await share.mutateAsync({ id: contact.id, isShared: true })
    setShowConfirm(false)
  }

  return (
    <>
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{contact.is_shared ? '🌐' : '🔒'}</span>
              <h3 className="font-bold text-gray-900">
                {contact.is_shared ? '팀에 공개 중' : '비공개'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {contact.is_shared
                ? '팀원들에게 마스킹된 정보로 표시됩니다. 이름·전화번호는 일부만 보여집니다.'
                : '나만 볼 수 있습니다. 공개하면 팀원과 마스킹된 형태로 공유됩니다.'}
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={share.isPending}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              contact.is_shared ? 'bg-primary' : 'bg-gray-200'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                contact.is_shared ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <button
          onClick={() => setShowPreview(true)}
          className="mt-4 text-sm text-primary font-medium hover:underline"
        >
          공개 미리보기 →
        </button>
      </div>

      {showPreview && (
        <MaskingPreview contact={contact} onClose={() => setShowPreview(false)} />
      )}

      {showConfirm && (
        <ConfirmShareModal
          contact={contact}
          onConfirm={confirmShare}
          onCancel={() => setShowConfirm(false)}
          loading={share.isPending}
        />
      )}
    </>
  )
}

function ConfirmShareModal({
  contact,
  onConfirm,
  onCancel,
  loading,
}: {
  contact: Contact
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-toss-xl shadow-toss-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {contact.name}님을 팀에 공개할까요?
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          공개하면 팀원들이 다음 정보를 볼 수 있습니다:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 mb-6 bg-gray-50 rounded-toss p-4">
          <li>✓ 마스킹된 이름 (예: 홍*동)</li>
          <li>✓ 마스킹된 전화번호 (예: 010-****-5678)</li>
          <li>✓ 나이, 성별</li>
          <li>✓ 직업 정보</li>
          <li className="text-red-500">✗ 주소, 메모, 상세정보는 비공개</li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 btn-primary"
          >
            {loading ? '처리 중...' : '공개하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
