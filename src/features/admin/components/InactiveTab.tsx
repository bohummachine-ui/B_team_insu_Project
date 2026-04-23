'use client'

// Design Ref: §5.4 비활성 탭 — 재활성화
import { useAdminMembers, useReactivateMember } from '../hooks/useAdminMembers'

export default function InactiveTab() {
  const { data: suspended, isLoading: sL } = useAdminMembers({ status: 'suspended' })
  const { data: rejected, isLoading: rL } = useAdminMembers({ status: 'rejected' })
  const reactivate = useReactivateMember()

  const isLoading = sL || rL
  const members = [
    ...(suspended ?? []).map((m) => ({ ...m, _label: '비활성' as const })),
    ...(rejected ?? []).map((m) => ({ ...m, _label: '반려' as const })),
  ]

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
  if (members.length === 0)
    return <div className="text-gray-400 text-sm py-12 text-center">비활성 사용자가 없습니다</div>

  return (
    <div className="card p-0 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            {m.profile_image_url ? (
              <img src={m.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover opacity-50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-500">{m.name?.charAt(0) ?? '?'}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-700">{m.name ?? '미등록'}</span>
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    m._label === '비활성' ? 'bg-gray-200 text-gray-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {m._label}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">{m.email}</div>
            </div>
            <button
              onClick={() => {
                if (confirm(`${m.name ?? m.email}을(를) 다시 활성화하시겠습니까?`)) {
                  reactivate.mutate(m.id)
                }
              }}
              disabled={reactivate.isPending}
              className="btn-secondary text-xs"
            >
              재활성화
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
