'use client'

// Design Ref: §5.4 팀원 관리 훅
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService, type MemberListFilter } from '../services/adminService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { UserRole } from '@/types'

export function useAdminMembers(filter: MemberListFilter = {}) {
  return useQuery({
    queryKey: ['admin', 'members', filter],
    queryFn: () => adminService.listMembers(filter),
    staleTime: 30_000,
  })
}

export function useMemberCounts() {
  return useQuery({
    queryKey: ['admin', 'members', 'counts'],
    queryFn: () => adminService.countByStatus(),
    staleTime: 30_000,
  })
}

export function useApproveMembers() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, role }: { userIds: string[]; role: UserRole }) => {
      if (!user?.id || !user?.team_id) throw new Error('팀장 정보를 찾을 수 없습니다')
      return adminService.approveMany(userIds, role, user.id, user.team_id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useRejectMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string[]) => adminService.rejectMany(userIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useChangeRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminService.changeRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useSuspendMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => adminService.suspend(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useReactivateMember() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!user?.team_id) throw new Error('팀 정보를 찾을 수 없습니다')
      return adminService.reactivate(userId, user.team_id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}
