'use client'

import { previewMaskedContact } from '../utils/maskContact'
import type { Contact } from '@/types'

interface Props {
  contact: Contact
  onClose: () => void
}

export default function MaskingPreview({ contact, onClose }: Props) {
  const masked = previewMaskedContact(contact)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-toss-xl shadow-toss-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">타팀원에게 보이는 모습</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50 rounded-toss p-4 space-y-3 text-sm">
          <Row label="이름" value={masked.name} />
          <Row label="전화번호" value={masked.phone} />
          <Row label="나이" value={masked.age ? `${masked.age}세` : '-'} />
          <Row
            label="성별"
            value={masked.gender ? (masked.gender === 'M' ? '남' : '여') : '-'}
          />
          <Row label="직업" value={masked.job ?? '-'} />
          <Row label="상세 직업" value={masked.job_detail ?? '-'} />
          <Row
            label="다음 연락일"
            value={
              masked.next_contact_date
                ? new Date(masked.next_contact_date).toLocaleDateString('ko-KR')
                : '-'
            }
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-toss p-3 mt-4">
          <p className="text-xs text-yellow-800 leading-relaxed">
            <strong>비공개:</strong> 이메일, 주소, 상세 메모, 가족 정보, 신체 정보,
            라벨은 타팀원에게 보이지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
