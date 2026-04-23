'use client'

import { useState } from 'react'
import {
  useCaseStudies,
  useCreateCaseStudy,
  useUpdateCaseStudy,
  useDeleteCaseStudy,
  useSetCaseStudyShared,
} from '../hooks/useCaseStudies'
import type { CaseStudy } from '@/types'
import ShareBadge from './ShareBadge'

export default function CasePanel() {
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState<'' | 'success' | 'fail'>('')
  const [editing, setEditing] = useState<CaseStudy | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useCaseStudies({
    search: search || undefined,
    outcome: outcome || undefined,
  })
  const setShared = useSetCaseStudyShared()

  if (editing || creating) {
    return (
      <CaseForm
        caseStudy={editing ?? undefined}
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
          placeholder="사례 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as '' | 'success' | 'fail')}
          className="input"
        >
          <option value="">전체</option>
          <option value="success">성공</option>
          <option value="fail">실패</option>
        </select>
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 사례
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">사례가 없습니다</div>
      )}

      <div className="space-y-2">
        {data?.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setEditing(c)} className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  {c.outcome === 'success' && <span className="text-green-500">✅</span>}
                  {c.outcome === 'fail' && <span className="text-red-500">❌</span>}
                  <h3 className="font-bold text-gray-900">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 whitespace-pre-wrap">
                  {c.body}
                </p>
              </button>
              <ShareBadge
                isShared={c.is_shared}
                onToggle={() => setShared.mutate({ id: c.id, isShared: !c.is_shared })}
                disabled={setShared.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaseForm({
  caseStudy,
  onClose,
}: {
  caseStudy?: CaseStudy
  onClose: () => void
}) {
  const [title, setTitle] = useState(caseStudy?.title ?? '')
  const [body, setBody] = useState(caseStudy?.body ?? '')
  const [outcome, setOutcome] = useState<'' | 'success' | 'fail'>(
    caseStudy?.outcome ?? ''
  )
  const [isShared, setIsShared] = useState(caseStudy?.is_shared ?? false)
  const create = useCreateCaseStudy()
  const update = useUpdateCaseStudy()
  const del = useDeleteCaseStudy()

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    const payload = {
      title,
      body,
      outcome: (outcome || null) as 'success' | 'fail' | null,
      is_shared: isShared,
    }
    if (caseStudy) {
      await update.mutateAsync({ id: caseStudy.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const remove = async () => {
    if (!caseStudy) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    await del.mutateAsync(caseStudy.id)
    onClose()
  }

  const busy = create.isPending || update.isPending || del.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold flex-1">{caseStudy ? '사례 수정' : '새 사례'}</h2>
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
          <span className="text-sm text-gray-600">결과</span>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as '' | 'success' | 'fail')}
            className="input mt-1 w-full"
          >
            <option value="">선택 안 함</option>
            <option value="success">성공</option>
            <option value="fail">실패</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">본문 *</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
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
          {caseStudy && (
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
