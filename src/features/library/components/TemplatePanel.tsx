'use client'

import { useState } from 'react'
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetTemplateShared,
  useIncrementTemplateUse,
} from '../hooks/useTemplates'
import { TEMPLATE_CATEGORY_LABEL } from '@/types'
import type { MessageTemplate } from '@/types'
import ShareBadge from './ShareBadge'
import { renderTemplate, extractVariables } from '../utils/renderTemplate'

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'greeting', label: '인사' },
  { value: 'info', label: '안내' },
  { value: 'proposal', label: '제안' },
  { value: 'closing', label: '마무리' },
]

export default function TemplatePanel() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const { data, isLoading } = useTemplates({
    search: search || undefined,
    category: category || undefined,
  })
  const setShared = useSetTemplateShared()
  const incUse = useIncrementTemplateUse()

  if (editing || creating) {
    return (
      <TemplateForm
        template={editing ?? undefined}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
      />
    )
  }

  const copy = async (t: MessageTemplate) => {
    const rendered = renderTemplate(t.body)
    await navigator.clipboard.writeText(rendered)
    incUse.mutate(t.id)
    alert('복사되었습니다')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="템플릿 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          <option value="">전체</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 템플릿
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">템플릿이 없습니다</div>
      )}

      <div className="space-y-2">
        {data?.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setEditing(t)} className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{t.title}</h3>
                  {t.category && (
                    <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded">
                      {TEMPLATE_CATEGORY_LABEL[t.category] ?? t.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 whitespace-pre-wrap">
                  {t.body}
                </p>
                <div className="text-xs text-gray-400 mt-1">사용 {t.use_count}회</div>
              </button>
              <div className="flex flex-col gap-1 items-end">
                <ShareBadge
                  isShared={t.is_shared}
                  onToggle={() => setShared.mutate({ id: t.id, isShared: !t.is_shared })}
                  disabled={setShared.isPending}
                />
                <button
                  onClick={() => copy(t)}
                  className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TemplateForm({
  template,
  onClose,
}: {
  template?: MessageTemplate
  onClose: () => void
}) {
  const [title, setTitle] = useState(template?.title ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [category, setCategory] = useState<string>(template?.category ?? '')
  const [isShared, setIsShared] = useState(template?.is_shared ?? false)
  const create = useCreateTemplate()
  const update = useUpdateTemplate()
  const del = useDeleteTemplate()

  const variables = extractVariables(body)

  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    const payload = {
      title,
      body,
      category: (category || null) as MessageTemplate['category'],
      is_shared: isShared,
    }
    if (template) {
      await update.mutateAsync({ id: template.id, patch: payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const remove = async () => {
    if (!template) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    await del.mutateAsync(template.id)
    onClose()
  }

  const busy = create.isPending || update.isPending || del.isPending

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ← 뒤로
        </button>
        <h2 className="text-lg font-bold flex-1">
          {template ? '템플릿 수정' : '새 템플릿'}
        </h2>
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
          <span className="text-sm text-gray-600">카테고리</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input mt-1 w-full"
          >
            <option value="">선택 안 함</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">본문 * (변수 예시: {'{고객명} · {나이} · {직업} · {성별} · {전화번호}'})</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="input mt-1 w-full"
          />
          {variables.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              감지된 변수: {variables.map((v) => `{${v}}`).join(', ')}
            </div>
          )}
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
          {template && (
            <button
              onClick={remove}
              disabled={busy}
              className="btn-secondary text-red-500"
            >
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
