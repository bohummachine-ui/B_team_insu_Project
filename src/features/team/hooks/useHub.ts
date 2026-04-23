'use client'

import { useQuery } from '@tanstack/react-query'
import { hubService } from '../services'
import type { HubFilter } from '@/types'

export function useHub(filter: HubFilter = {}) {
  return useQuery({
    queryKey: ['hub', filter],
    queryFn: () => hubService.list(filter),
  })
}
