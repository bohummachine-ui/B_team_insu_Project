'use client'

// Design Ref: §5.4 Members 탭 — 역할 변경, 비활성화
import { useState } from 'react'
import { useAdminMembers, useChangeRole, useSuspendMember } from '../hooks/useAdminMembers'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { UserRole } from '@/types'

export default function MembersTab() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const { data: members, isLoading } = useAdminMembers({ status: 'active', search: search.trim() || undefined })
  const changeRole = useChangeRole()
  const suspend = useSuspendMember()

  const doChangeRole = (userId: string, nextRole: UserRole) => {
    if (userId === me?.id && nextRole === 'member') {
      if (!confirm('본인 역할을 팀원으로 변경하면 설정 페이지에 접근할 수 없게 됩니다. 계속할까요?')) return
    }
    changeRole.mutate({ userId, role: nextRole })
  }

  const doSuspend = (userId: string) => {
    if (userId === me?.id) {
      alert('본인은 비활성화할 수 없습니다')
      return
    }
    if (!confirm('이 사용자를 비활성화하시겠습니까?')) return
    suspend.mutate(userId)
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름·이메일 검색"
        className="input max-w-md"
      />

      {isLoading ? (
        <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
      ) : !members || members.length === 0 ? (
        <div className="text-gray-400 text-sm py-12 text-center">활동 중인 사용자가 없습니다</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                {m.profile_image_url ? (
                  <img src={m.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{m.name?.charAt(0) ?? '?'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{m.name ?? '미등록'}</span>
                    {m.id === me?.id && (
                      <span className="text-xs text-primary">(나)</span>
                    )}
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        m.role === 'admin'
                          ? 'bg-primary-50 text-primary'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.role === 'admin' ? '팀장' : '팀원'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{m.email}</div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => doChangeRole(m.id, e.target.value as UserRole)}
                  disabled={changeRole.isPending}
                  className="input text-xs py-1 w-20"
                >
                  <option value="member">팀원</option>
                  <option value="admin">팀장</option>
                </select>
                <button
                  onClick={() => doSuspend(m.id)}
                  disabled={suspend.isPending || m.id === me?.id}
                  className="text-xs text-red-500 hover:underline disabled:opacity-40"
                >
                  비활성화
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
