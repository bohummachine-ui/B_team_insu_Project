'use client'

import { useState } from 'react'
import {
  useMemos,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
} from '../hooks/useMemos'
import type { PersonalMemo } from '@/types'

export default function MemoPanel() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<PersonalMemo | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useMemos({ search: search || undefined })

  if (editing || creating) {
    return (
      <MemoForm
        memo={editing ?? undefined}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 text-gray-600 text-xs p-3 rounded-toss">
        📋 개인 메모는 나만 볼 수 있습니다 (팀 공유 없음)
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="메모 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 메모
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">메모가 없습니다</div>
      )}

      <div className="space-y-2">
        {data?.map((m) => (
          <button
            key={m.id}
            onClick={() => setEditing(m)}
            className="card text-left w-full hover:shadow-toss transition-shadow"
          >
            <h3 className="font-bold text-gray-900">{m.title}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">
              {m.body}
            </p>
            <div className="text-xs text-gray-400 mt-2">
              {new Date(m.created_at).toLocaleDateString('ko-KR')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MemoForm({ memo, onClose }: { memo?: PersonalMemo; onClose: () => void }) {
  const [title, setTitle] = useState(memo?.title ?? '')
  const [body, setBody] = useState(memo?.body ?? '')
  const create = useCreateMemo()
  const update = useUpdateMemo()
  const del = useDeleteMemo()

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    if (memo) {
      await update.mutateAsync({ id: memo.id, patch: { title, body } })
    } else {
      await create.mutateAsync({ title, body })
    }
    onClose()
  }

  const remove = async () => {
    if (!memo) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    await del.mutateAsync(memo.id)
    onClose()
  }

  const busy = create.isPending || update.isPending || del.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold flex-1">{memo ? '메모 수정' : '새 메모'}</h2>
      </div>

      <div className="card space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">제목 *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">본문 *</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="input mt-1 w-full"
          />
        </label>

        <div className="flex gap-2 pt-2">
          {memo && (
            <button onClick={remove} disabled={busy} className="btn-secondary text-red-500">
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={busy} className="btn-secondary">
            취소
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim() || !body.trim()}
            className="btn-primary"
          >
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
