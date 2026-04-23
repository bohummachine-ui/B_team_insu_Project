'use client'

// Design Ref: §5 /team — 팀원 목록 페이지 (검색/역할/정렬 + 가상 스크롤)
import { useState } from 'react'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRealtimeShare } from '../hooks/useRealtimeShare'
import TeamVirtualList from './TeamVirtualList'
import type { TeamMemberListFilter } from '../services'

export default function TeamListPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'' | 'admin' | 'member'>('')
  const [sortBy, setSortBy] = useState<NonNullable<TeamMemberListFilter['sortBy']>>('name')
  const { user } = useAuth()

  useRealtimeShare(['contacts', 'scripts', 'message_templates', 'image_assets'])

  const { data, isLoading } = useTeamMembers({
    search: search || undefined,
    role: role || null,
    sortBy,
  })

  const count = data?.length ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">백지운 지점 팀원 {count}명</h1>
        <p className="text-sm text-gray-500 mt-1">
          같은 지점 팀원의 공유 자료와 공개 고객을 확인할 수 있습니다
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as '' | 'admin' | 'member')}
          className="input"
        >
          <option value="">전체 역할</option>
          <option value="admin">팀장</option>
          <option value="member">팀원</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as NonNullable<TeamMemberListFilter['sortBy']>)}
          className="input"
        >
          <option value="name">이름순</option>
          <option value="shared_count">공유 자료순</option>
          <option value="attendance">근태순</option>
          <option value="joined">가입일순</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
      ) : (
        <TeamVirtualList members={data ?? []} currentUserId={user?.id ?? null} />
      )}
    </div>
  )
}
