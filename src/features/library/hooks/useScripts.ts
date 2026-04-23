'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scriptService, type ScriptListFilter } from '../services'
import type { ScriptUpdate } from '@/types'

const KEY = 'library-scripts'

export function useScripts(filter: ScriptListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => scriptService.list(filter),
  })
}

export function useScript(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => (id ? scriptService.get(id) : null),
    enabled: !!id,
  })
}

export function useCreateScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof scriptService.create>[0]) =>
      scriptService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useUpdateScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ScriptUpdate }) =>
      scriptService.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY, 'detail', data.id] })
      qc.invalidateQueries({ queryKey: [KEY, 'list'] })
    },
  })
}

export function useDeleteScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scriptService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useSetScriptShared() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      scriptService.setShared(id, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
