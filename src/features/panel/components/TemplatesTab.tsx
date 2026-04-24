// Design Ref: §5.4 — 우측 패널 메시지 템플릿 탭
'use client'

import { useState, useMemo } from 'react'
import { useTemplates } from '@/features/library/hooks/useTemplates'
import { templateService } from '@/features/library/services'
import { TEMPLATE_CATEGORY_LABEL } from '@/types'
import type { TemplateCategory } from '@/types/database.types'
import { usePanelStore } from '@/store/panelStore'
import { copyText } from '../utils/clipboard'
import { renderTemplate } from '@/features/library/utils/renderTemplate'
import { useCopyToast } from '../hooks/useCopyToast'
import Toast from './Toast'

type CategoryFilter = TemplateCategory | 'all'

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'greeting', label: '인사' },
  { value: 'info', label: '안내' },
  { value: 'proposal', label: '제안' },
  { value: 'closing', label: '마무리' },
]

export default function TemplatesTab() {
  const { targetCustomerName, targetCustomerVars } = usePanelStore()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const { data: templates = [], isLoading } = useTemplates({
    category: category === 'all' ? null : category,
    search: search || undefined,
  })
  const toast = useCopyToast()

  // renderTemplate에 넘길 변수 맵 구성
  // 지원 변수: {고객명} {고객} {이름} {나이} {직업} {상세직업} {성별} {전화} {전화번호}
  const templateVars = useMemo(() => {
    if (targetCustomerVars) {
      const genderLabel = targetCustomerVars.gender === 'M' ? '남' : targetCustomerVars.gender === 'F' ? '여' : ''
      return {
        고객명: targetCustomerVars.name,
        고객: targetCustomerVars.name,
        이름: targetCustomerVars.name,
        성함: targetCustomerVars.name,
        나이: targetCustomerVars.age ?? '',
        직업: targetCustomerVars.job ?? '',
        상세직업: targetCustomerVars.jobDetail ?? targetCustomerVars.job ?? '',
        직업상세: targetCustomerVars.jobDetail ?? targetCustomerVars.job ?? '',
        성별: genderLabel,
        전화: targetCustomerVars.phone ?? '',
        전화번호: targetCustomerVars.phone ?? '',
      }
    }
    if (targetCustomerName) {
      return { 고객명: targetCustomerName, 고객: targetCustomerName, 이름: targetCustomerName, 성함: targetCustomerName }
    }
    return {}
  }, [targetCustomerVars, targetCustomerName])

  const withPreview = useMemo(
    () =>
      templates.map((t) => ({
        ...t,
        preview: renderTemplate(t.body, templateVars),
      })),
    [templates, templateVars]
  )

  const handleCopy = async (id: string, previewText: string) => {
    try {
      await copyText(previewText)
      toast.show('복사됨!')
      void templateService.incrementUseCount(id).catch(() => {})
    } catch (err) {
      toast.show(err instanceof Error ? err.message : '복사 실패', true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-100 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="템플릿 검색"
          className="w-full px-3 py-2 rounded-toss border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
        />
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${category === c.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {targetCustomerVars ? (
          <p className="text-xs text-blue-600">
            변수 치환:
            <span className="font-semibold ml-1">{targetCustomerVars.name}</span>
            {targetCustomerVars.age !== null && <span className="ml-1">{targetCustomerVars.age}세</span>}
            {targetCustomerVars.job && <span className="ml-1">· {targetCustomerVars.job}</span>}
          </p>
        ) : targetCustomerName ? (
          <p className="text-xs text-blue-600">
            변수 치환: <span className="font-semibold">{targetCustomerName}</span>
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading && <p className="text-center text-sm text-gray-400 py-8">불러오는 중...</p>}
        {!isLoading && withPreview.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">등록된 템플릿이 없습니다.</p>
            <p className="text-xs mt-1">자료실에서 템플릿을 추가하세요.</p>
          </div>
        )}
        {withPreview.map((t) => (
          <button
            key={t.id}
            onClick={() => handleCopy(t.id, t.preview)}
            className="w-full text-left p-3 rounded-toss border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {t.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {TEMPLATE_CATEGORY_LABEL[t.category] ?? t.category}
                </span>
              )}
              <span className="text-sm font-semibold text-gray-900 truncate">{t.title}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{t.preview}</p>
          </button>
        ))}
      </div>

      <Toast message={toast.message} isError={toast.isError} />
    </div>
  )
}
