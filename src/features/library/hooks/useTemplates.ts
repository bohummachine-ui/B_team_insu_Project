'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateService, type TemplateListFilter } from '../services'
import type { MessageTemplateUpdate } from '@/types'
import { useTemplateOrderStore } from '@/store/templateOrderStore'

const KEY = 'library-templates'

export function useTemplates(filter: TemplateListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => templateService.list(filter),
  })
}

/** 저장된 순서를 적용한 템플릿 목록 (TemplatePanel / TemplatesTab 공용) */
export function useOrderedTemplates(filter: TemplateListFilter = {}) {
  const { data: templates = [], ...rest } = useTemplates(filter)
  const orderedIds = useTemplateOrderStore((s) => s.orderedIds)

  const ordered = useMemo(() => {
    if (orderedIds.length === 0) return templates
    const map = new Map(templates.map((t) => [t.id, t]))
    const result = orderedIds.flatMap((id) => {
      const t = map.get(id)
      if (t) { map.delete(id); return [t] }
      return []
    })
    // 순서 목록에 없는 신규 템플릿은 끝에 추가
    map.forEach((t) => result.push(t))
    return result
  }, [templates, orderedIds])

  return { data: ordered, ...rest }
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => (id ? templateService.get(id) : null),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof templateService.create>[0]) =>
      templateService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MessageTemplateUpdate }) =>
      templateService.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, 'detail', data.id] })
      qc.invalidateQueries({ queryKey: [KEY, 'list'] })
    },
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templateService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useSetTemplateShared() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      templateService.setShared(id, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useIncrementTemplateUse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templateService.incrementUseCount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}
