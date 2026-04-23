'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { imageAssetService, type ImageListFilter } from '../services'
import type { ImageAssetUpdate } from '@/types'

const KEY = 'library-images'

export function useImageAssets(filter: ImageListFilter = {}) {
  return useQuery({
    queryKey: [KEY, 'list', filter],
    queryFn: () => imageAssetService.list(filter),
  })
}

export function useImageUsage() {
  return useQuery({
    queryKey: [KEY, 'usage'],
    queryFn: () => imageAssetService.getOwnUsage(),
  })
}

export function useUploadImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof imageAssetService.upload>[0]) =>
      imageAssetService.upload(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useUpdateImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ImageAssetUpdate }) =>
      imageAssetService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => imageAssetService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useSetImageShared() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      imageAssetService.setShared(id, isShared),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
