'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '../services/contactService'
import type { ContactUpdate } from '@/types'

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contacts', 'detail', id],
    queryFn: () => (id ? contactService.get(id) : null),
    enabled: !!id,
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ContactUpdate }) =>
      contactService.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['contacts', 'detail', data.id] })
      qc.invalidateQueries({ queryKey: ['contacts', 'list'] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', 'list'] })
    },
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof contactService.create>[0]) =>
      contactService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', 'list'] })
    },
  })
}
