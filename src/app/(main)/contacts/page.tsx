'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useBulkContactShare } from '@/features/contacts/hooks/useContactShare'
import ContactList from '@/features/contacts/components/ContactList'
import ContactCard from '@/features/contacts/components/ContactCard'
import { exportContactsAsCsv, exportContactsAsVcf } from '@/features/contacts/utils/exportContacts'

type ViewMode = 'list' | 'card'

export default function ContactsPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [isShared, setIsShared] = useState<boolean | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: contacts = [], isLoading } = useContacts({ search, isShared })
  const bulkShare = useBulkContactShare()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedContacts = () =>
    selectedIds.size > 0
      ? contacts.filter((c) => selectedIds.has(c.id))
      : contacts

  const handleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
  }

  const handleBulkShare = async (shared: boolean) => {
    if (selectedIds.size === 0) return
    await bulkShare.mutateAsync({ ids: Array.from(selectedIds), isShared: shared })
    setSelectedIds(new Set())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주소록</h1>
          <p className="text-sm text-gray-500 mt-1">전체 {contacts.length}명</p>
        </div>
        <Link href="/contacts/new" className="btn-primary">
          + 고객 추가
        </Link>
      </div>

      {/* Toolbar */}
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·전화·메모 검색... (Ctrl+K)"
            className="input-field"
          />
        </div>

        <select
          value={isShared === null ? 'all' : isShared ? 'shared' : 'private'}
          onChange={(e) => {
            const v = e.target.value
            setIsShared(v === 'all' ? null : v === 'shared')
          }}
          className="input-field w-32"
        >
          <option value="all">전체</option>
          <option value="private">🔒 비공개</option>
          <option value="shared">🌐 공개</option>
        </select>

        <div className="flex gap-1">
          <button
            onClick={() => exportContactsAsCsv(selectedContacts())}
            disabled={contacts.length === 0}
            className="text-sm px-3 py-1.5 rounded-toss border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title={selectedIds.size > 0 ? `선택 ${selectedIds.size}명 CSV` : '전체 CSV'}
          >
            CSV
          </button>
          <button
            onClick={() => exportContactsAsVcf(selectedContacts())}
            disabled={contacts.length === 0}
            className="text-sm px-3 py-1.5 rounded-toss border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title={selectedIds.size > 0 ? `선택 ${selectedIds.size}명 VCF` : '전체 VCF'}
          >
            VCF
          </button>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-toss p-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            리스트
          </button>
          <button
            onClick={() => setView('card')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            카드
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-toss px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">
            {selectedIds.size}명 선택됨
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkShare(true)}
              disabled={bulkShare.isPending}
              className="text-sm px-3 py-1.5 bg-white text-primary rounded-toss font-medium hover:bg-primary-50"
            >
              🌐 일괄 공개
            </button>
            <button
              onClick={() => handleBulkShare(false)}
              disabled={bulkShare.isPending}
              className="text-sm px-3 py-1.5 bg-white text-gray-700 rounded-toss font-medium hover:bg-gray-50"
            >
              🔒 일괄 비공개
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : view === 'list' ? (
        <ContactList contacts={contacts} selectedIds={selectedIds} onSelect={handleSelect} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              selected={selectedIds.has(c.id)}
              onSelect={handleSelect}
            />
          ))}
          {contacts.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400 text-sm">
              등록된 고객이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
