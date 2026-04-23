'use client'

import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return {
    user: user ?? null,
    isLoading,
    isAdmin: user?.role === 'admin',
    isMember: user?.role === 'member',
  }
}
