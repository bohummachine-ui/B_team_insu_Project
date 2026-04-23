'use client'

// Design Ref: §5.7 /attendance — 월간 출석표 데이터 (팀 전체 or 개인)
import { useQuery } from '@tanstack/react-query'
import { attendanceService, type MonthlyRangeInput } from '../services'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function useMonthlyTeamAttendance(input: MonthlyRangeInput, userIds?: string[]) {
  return useQuery({
    queryKey: ['attendance', 'monthly-team', input, userIds?.join(',') ?? ''],
    queryFn: () => attendanceService.listMonthly(input, userIds),
    staleTime: 60 * 1000,
  })
}

export function useMonthlyMineAttendance(input: MonthlyRangeInput) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['attendance', 'monthly-mine', input, user?.id],
    queryFn: () => (user ? attendanceService.listMine(input, user.id) : []),
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

export function useOfficeIps() {
  return useQuery({
    queryKey: ['attendance', 'office-ips'],
    queryFn: () => attendanceService.listOfficeIps(),
  })
}
