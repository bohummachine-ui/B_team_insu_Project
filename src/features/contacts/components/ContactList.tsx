'use client'

import { useRouter } from 'next/navigation'
import type { Contact } from '@/types'
import { calcAge } from '../utils/maskContact'

interface Props {
  contacts: Contact[]
  selectedIds?: Set<string>
  onSelect?: (id: string, checked: boolean) => void
}

export default function ContactList({ contacts, selectedIds, onSelect }: Props) {
  const router = useRouter()
  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-left text-xs font-medium text-gray-500">
            {onSelect && <th className="px-4 py-3 w-10"></th>}
            <th className="px-4 py-3 w-10"></th>
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">전화번호</th>
            <th className="px-4 py-3">나이/성별</th>
            <th className="px-4 py-3">직업</th>
            <th className="px-4 py-3">다음 연락일</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const age = calcAge(contact.birthday)
            const goDetail = () => router.push(`/contacts/${contact.id}`)
            return (
              <tr
                key={contact.id}
                onClick={goDetail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    goDetail()
                  }
                }}
                tabIndex={0}
                role="link"
                className="border-b border-gray-50 hover:bg-gray-50 focus:bg-gray-50 outline-none cursor-pointer transition-colors"
              >
                {onSelect && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(contact.id) ?? false}
                      onChange={(e) => onSelect(contact.id, e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <span title={contact.is_shared ? '공개' : '비공개'}>
                    {contact.is_shared ? '🌐' : '🔒'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{contact.name}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                <td className="px-4 py-3 text-gray-600">
                  {age !== null ? `${age}세` : '-'}
                  {contact.gender ? ` / ${contact.gender === 'M' ? '남' : '여'}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-600">{contact.job ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {contact.next_contact_date
                    ? new Date(contact.next_contact_date).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {contacts.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          등록된 고객이 없습니다
        </div>
      )}
    </div>
  )
}
