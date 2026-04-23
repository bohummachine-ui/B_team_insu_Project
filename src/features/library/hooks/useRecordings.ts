'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recordingService, type RecordingListFilter } from '../services'
import type { RecordingUpdate } from '@/types'

const KEY = 'library-recordings'

export function useRecordings(filter: RecordingListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => recordingService.list(filter),
  })
}

export function useRecording(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => (id ? recordingService.get(id) : null),
    enabled: !!id,
  })
}

export function useCreateRecording() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof recordingService.create>[0]) =>
      recordingService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useUpdateRecording() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecordingUpdate }) =>
      recordingService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteRecording() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recordingService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  })
}

export function useSetRecordingShared() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      recordingService.setShared(id, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
