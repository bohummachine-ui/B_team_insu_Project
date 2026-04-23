'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '../services/contactService'

export function useContactShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      contactService.setShared(id, isShared),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['contacts', 'detail', data.id] })
      qc.invalidateQueries({ queryKey: ['contacts', 'list'] })
    },
  })
}

export function useBulkContactShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, isShared }: { ids: string[]; isShared: boolean }) =>
      contactService.bulkSetShared(ids, isShared),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', 'list'] })
    },
  })
}
