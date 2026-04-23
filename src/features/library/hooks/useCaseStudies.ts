'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { caseStudyService, type CaseStudyListFilter } from '../services'
import type { CaseStudyUpdate } from '@/types'

const KEY = 'library-cases'

export function useCaseStudies(filter: CaseStudyListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => caseStudyService.list(filter),
  })
}

export function useCaseStudy(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => (id ? caseStudyService.get(id) : null),
    enabled: !!id,
  })
}

export function useCreateCaseStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof caseStudyService.create>[0]) =>
      caseStudyService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useUpdateCaseStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CaseStudyUpdate }) =>
      caseStudyService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteCaseStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => caseStudyService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useSetCaseStudyShared() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      caseStudyService.setShared(id, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
