'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useOrderedTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetTemplateShared,
  useIncrementTemplateUse,
} from '../hooks/useTemplates'
import { useTemplateOrderStore } from '@/store/templateOrderStore'
import { TEMPLATE_CATEGORY_LABEL } from '@/types'
import type { MessageTemplate } from '@/types'
import ShareBadge from './ShareBadge'
import { renderTemplate } from '../utils/renderTemplate'

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'greeting', label: '인사' },
  { value: 'info', label: '안내' },
  { value: 'proposal', label: '제안' },
  { value: 'closing', label: '마무리' },
]

// ──────────────────────────────────────────────
// 드래그 가능한 카드 컴포넌트
// ──────────────────────────────────────────────
function TemplateCard({
  template,
  onEdit,
  onCopy,
  onToggleShare,
  isSharedPending,
}: {
  template: MessageTemplate
  onEdit: () => void
  onCopy: () => void
  onToggleShare: () => void
  isSharedPending: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: template.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card flex flex-col gap-2 relative group"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        title="드래그해서 순서 변경"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* 카드 본문 — 클릭하면 편집 */}
      <button onClick={onEdit} className="text-left space-y-1 flex-1 pr-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {template.category && (
            <span className="text-xs bg-blue-50 text-primary px-1.5 py-0.5 rounded">
              {TEMPLATE_CATEGORY_LABEL[template.category] ?? template.category}
            </span>
          )}
          <span className="text-sm font-bold text-gray-900 line-clamp-1">{template.title}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {renderTemplate(template.body)}
        </p>
        <p className="text-xs text-gray-400">사용 {template.use_count}회</p>
      </button>

      {/* 액션 */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <ShareBadge
          isShared={template.is_shared}
          onToggle={onToggleShare}
          disabled={isSharedPending}
        />
        <button
          onClick={onCopy}
          className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
        >
          복사
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// 메인 패널
// ──────────────────────────────────────────────
export default function TemplatePanel() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [editing, setEditing] = useState<MessageTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  const { data = [], isLoading } = useOrderedTemplates({
    search: search || undefined,
    category: category || undefined,
  })
  const { setOrder } = useTemplateOrderStore()
  const setShared = useSetTemplateShared()
  const incUse = useIncrementTemplateUse()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = data.map((t) => t.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    setOrder(arrayMove(ids, oldIndex, newIndex))
  }

  const copy = async (t: MessageTemplate) => {
    const rendered = renderTemplate(t.body)
    await navigator.clipboard.writeText(rendered)
    incUse.mutate(t.id)
    alert('복사되었습니다')
  }

  if (editing || creating) {
    return (
      <TemplateForm
        template={editing ?? undefined}
        onClose={() => { setEditing(null); setCreating(false) }}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* 필터 */}
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
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button onClick={() => setCreating(true)} className="btn-primary whitespace-nowrap">
          + 새 템플릿
        </button>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && data.length === 0 && (
        <div className="text-gray-400 text-sm py-8 text-center">템플릿이 없습니다</div>
      )}

      {/* 카드 그리드 + 드래그 앤 드롭 */}
      {data.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {data.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => setEditing(t)}
                  onCopy={() => copy(t)}
                  onToggleShare={() => setShared.mutate({ id: t.id, isShared: !t.is_shared })}
                  isSharedPending={setShared.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// 템플릿 등록/수정 폼 (기존과 동일)
// ──────────────────────────────────────────────
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
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">← 뒤로</button>
        <h2 className="text-lg font-bold flex-1">{template ? '템플릿 수정' : '새 템플릿'}</h2>
      </div>

      <div className="card space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">제목 *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1 w-full" />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">카테고리</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1 w-full">
            <option value="">선택 안 함</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">
            본문 * (변수 예시: {'{고객명} · {나이} · {직업} · {성별} · {전화번호}'})
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="input mt-1 w-full"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-gray-700">팀에 공유</span>
        </label>

        <div className="flex gap-2 pt-2">
          {template && (
            <button onClick={remove} disabled={busy} className="btn-secondary text-red-500">삭제</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={busy} className="btn-secondary">취소</button>
          <button onClick={submit} disabled={busy || !title.trim() || !body.trim()} className="btn-primary">
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
