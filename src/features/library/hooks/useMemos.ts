'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoService, type MemoListFilter } from '../services'
import type { PersonalMemoUpdate } from '@/types'

const KEY = 'library-memos'

export function useMemos(filter: MemoListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => memoService.list(filter),
  })
}

export function useMemo_(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => (id ? memoService.get(id) : null),
    enabled: !!id,
  })
}

export function useCreateMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof memoService.create>[0]) =>
      memoService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useUpdateMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PersonalMemoUpdate }) =>
      memoService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => memoService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}
