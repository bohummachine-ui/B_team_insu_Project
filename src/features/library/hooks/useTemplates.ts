'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateService, type TemplateListFilter } from '../services'
import type { MessageTemplateUpdate } from '@/types'

const KEY = 'library-templates'

export function useTemplates(filter: TemplateListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => templateService.list(filter),
  })
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
