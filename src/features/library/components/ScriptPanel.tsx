'use client'

import { useState } from 'react'
import {
  useScripts,
  useCreateScript,
  useUpdateScript,
  useDeleteScript,
  useSetScriptShared,
} from '../hooks/useScripts'
import type { Script } from '@/types'
import ShareBadge from './ShareBadge'

export default function ScriptPanel() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Script | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useScripts({ search: search || undefined })
  const setShared = useSetScriptShared()

  if (editing || creating) {
    return (
      <ScriptForm
        script={editing ?? undefined}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="스크립트 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 스크립트
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">스크립트가 없습니다</div>
      )}

      <div className="space-y-2">
        {data?.map((s) => (
          <div key={s.id} className="card hover:shadow-toss transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => setEditing(s)}
                className="flex-1 text-left"
              >
                <h3 className="font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                  {s.body}
                </p>
                {s.tags && s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.tags.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              <ShareBadge
                isShared={s.is_shared}
                onToggle={() => setShared.mutate({ id: s.id, isShared: !s.is_shared })}
                disabled={setShared.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScriptForm({ script, onClose }: { script?: Script; onClose: () => void }) {
  const [title, setTitle] = useState(script?.title ?? '')
  const [body, setBody] = useState(script?.body ?? '')
  const [tagsText, setTagsText] = useState((script?.tags ?? []).join(', '))
  const [isShared, setIsShared] = useState(script?.is_shared ?? false)
  const create = useCreateScript()
  const update = useUpdateScript()
  const del = useDeleteScript()

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (script) {
      await update.mutateAsync({
        id: script.id,
        patch: { title, body, tags: tags.length ? tags : null, is_shared: isShared },
      })
    } else {
      await create.mutateAsync({
        title,
        body,
        tags: tags.length ? tags : null,
        is_shared: isShared,
      })
    }
    onClose()
  }

  const remove = async () => {
    if (!script) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    await del.mutateAsync(script.id)
    onClose()
  }

  const busy = create.isPending || update.isPending || del.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold flex-1">{script ? '스크립트 수정' : '새 스크립트'}</h2>
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
            rows={8}
            className="input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">태그 (쉼표로 구분)</span>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="예: 영업, 상담, 신규"
            className="input mt-1 w-full"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">팀에 공유</span>
        </label>

        <div className="flex gap-2 pt-2">
          {script && (
            <button onClick={remove} disabled={busy} className="btn-secondary text-red-500">
              삭제
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={busy} className="btn-secondary">
            취소
          </button>
          <button onClick={submit} disabled={busy || !title.trim() || !body.trim()} className="btn-primary">
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
