'use client'

// Design Ref: §5.4 Pending 승인 대기 (일괄 승인/반려)
import { useState } from 'react'
import { useAdminMembers, useApproveMembers, useRejectMembers } from '../hooks/useAdminMembers'
import type { UserRole } from '@/types'

export default function PendingTab() {
  const { data: pending, isLoading } = useAdminMembers({ status: 'pending' })
  const approve = useApproveMembers()
  const reject = useRejectMembers()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [roleToAssign, setRoleToAssign] = useState<UserRole>('member')
  const [confirmOpen, setConfirmOpen] = useState<'approve' | 'reject' | null>(null)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (!pending) return
    if (selected.size === pending.length) setSelected(new Set())
    else setSelected(new Set(pending.map((m) => m.id)))
  }

  const doApprove = async () => {
    try {
      await approve.mutateAsync({ userIds: Array.from(selected), role: roleToAssign })
      setSelected(new Set())
      setConfirmOpen(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : '승인 실패')
    }
  }

  const doReject = async () => {
    try {
      await reject.mutateAsync(Array.from(selected))
      setSelected(new Set())
      setConfirmOpen(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : '반려 실패')
    }
  }

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
  if (!pending || pending.length === 0)
    return <div className="text-gray-400 text-sm py-12 text-center">승인 대기 중인 사용자가 없습니다</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-toss">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === pending.length && pending.length > 0}
            onChange={toggleAll}
          />
          <span className="text-sm font-medium text-gray-700">
            전체 선택 ({selected.size}/{pending.length})
          </span>
        </label>
        <div className="flex-1" />
        <select
          value={roleToAssign}
          onChange={(e) => setRoleToAssign(e.target.value as UserRole)}
          className="input text-sm py-1.5"
        >
          <option value="member">팀원</option>
          <option value="admin">팀장</option>
        </select>
        <button
          onClick={() => setConfirmOpen('approve')}
          disabled={selected.size === 0 || approve.isPending}
          className="btn-primary text-sm"
        >
          일괄 승인
        </button>
        <button
          onClick={() => setConfirmOpen('reject')}
          disabled={selected.size === 0 || reject.isPending}
          className="btn-secondary text-sm"
        >
          일괄 반려
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {pending.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
              />
              {m.profile_image_url ? (
                <img src={m.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-500">{m.name?.charAt(0) ?? '?'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{m.name ?? '미등록'}</div>
                <div className="text-xs text-gray-500 truncate">{m.email}</div>
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {m.created_at.slice(0, 10)} 가입
              </div>
            </li>
          ))}
        </ul>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmOpen(null)}
        >
          <div
            className="bg-white rounded-toss-xl shadow-toss-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-900 mb-2">
              {confirmOpen === 'approve' ? '일괄 승인 확인' : '일괄 반려 확인'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              선택한 {selected.size}명을{' '}
              {confirmOpen === 'approve' ? (
                <>
                  <span className="font-bold text-primary">{roleToAssign === 'admin' ? '팀장' : '팀원'}</span>{' '}
                  으로 승인하시겠습니까?
                </>
              ) : (
                '반려하시겠습니까?'
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(null)} className="btn-secondary">
                취소
              </button>
              <button
                onClick={confirmOpen === 'approve' ? doApprove : doReject}
                className="btn-primary"
                disabled={approve.isPending || reject.isPending}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
