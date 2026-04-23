'use client'

import Link from 'next/link'
import type { Contact } from '@/types'
import { calcAge } from '../utils/maskContact'

interface Props {
  contact: Contact
  selected?: boolean
  onSelect?: (id: string, checked: boolean) => void
}

export default function ContactCard({ contact, selected, onSelect }: Props) {
  const age = calcAge(contact.birthday)

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className="card hover:shadow-toss-md transition-shadow cursor-pointer block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{contact.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{contact.name}</p>
            <p className="text-xs text-gray-500">
              {age !== null ? `${age}세` : ''}
              {contact.gender ? ` · ${contact.gender === 'M' ? '남' : '여'}` : ''}
            </p>
          </div>
        </div>
        <span
          className="text-xs"
          title={contact.is_shared ? '팀에 공개됨' : '비공개'}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault()
            }
          }}
        >
          {contact.is_shared ? '🌐' : '🔒'}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>{contact.phone}</p>
        {contact.job && <p className="text-xs text-gray-500">{contact.job}</p>}
        {contact.next_contact_date && (
          <p className="text-xs text-primary mt-2">
            다음 연락: {new Date(contact.next_contact_date).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {onSelect && (
        <label
          className="absolute top-3 left-3"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelect(contact.id, e.target.checked)}
            className="w-4 h-4 rounded text-primary"
          />
        </label>
      )}
    </Link>
  )
}
