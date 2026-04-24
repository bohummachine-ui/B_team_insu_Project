// Design Ref: §5.1 — Gemini API 키 상태/등록/삭제 React Query 훅
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vaultService, type GeminiKeyStatus } from '../services/vaultService'

const KEY = 'gemini-key'

export function useGeminiKeyStatus() {
  return useQuery<GeminiKeyStatus>({
    queryKey: [KEY, 'status'],
    queryFn: () => vaultService.getGeminiKeyStatus(),
    staleTime: 30_000,
  })
}

export function useSetGeminiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => vaultService.setGeminiKey(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteGeminiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => vaultService.deleteGeminiKey(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
