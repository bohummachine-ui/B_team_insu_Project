'use client'

// Design Ref: §5.4 설정 (팀장 전용) — 3탭: Pending/Members/비활성
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMemberCounts } from '../hooks/useAdminMembers'
import PendingTab from './PendingTab'
import MembersTab from './MembersTab'
import InactiveTab from './InactiveTab'

type Tab = 'pending' | 'members' | 'inactive'

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth()
  const { data: counts } = useMemberCounts()
  const [tab, setTab] = useState<Tab>('pending')

  if (isLoading) {
    return <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
  }

  if (!isAdmin) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-lg font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
        <p className="text-sm text-gray-500">이 페이지는 팀장만 접근할 수 있습니다.</p>
      </div>
    )
  }

  const pendingCount = counts?.pending ?? 0
  const activeCount = counts?.active ?? 0
  const inactiveCount = (counts?.suspended ?? 0) + (counts?.rejected ?? 0)

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'pending', label: '승인 대기', count: pendingCount },
    { key: 'members', label: 'Members', count: activeCount },
    { key: 'inactive', label: '비활성', count: inactiveCount },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">팀원 관리</h1>
        <p className="text-sm text-gray-500 mt-1">팀장 전용 — 승인·역할·비활성화 관리</p>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab />}
      {tab === 'members' && <MembersTab />}
      {tab === 'inactive' && <InactiveTab />}
    </div>
  )
}
