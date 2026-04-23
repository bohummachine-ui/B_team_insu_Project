'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { favoriteService } from '../services'
import type { FavoriteTarget } from '@/types'

const KEY = 'favorites'

export function useFavorites() {
  const query = useQuery({
    queryKey: [KEY],
    queryFn: () => favoriteService.list(),
  })

  const set = useMemo(() => {
    const s = new Set<string>()
    for (const f of query.data ?? []) s.add(`${f.target_type}:${f.target_id}`)
    return s
  }, [query.data])

  return { ...query, isFavorite: (type: FavoriteTarget, id: string) => set.has(`${type}:${id}`) }
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      type,
      id,
      currentlyFavorite,
    }: {
      type: FavoriteTarget
      id: string
      currentlyFavorite: boolean
    }) => {
      if (currentlyFavorite) await favoriteService.remove(type, id)
      else await favoriteService.add(type, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
