'use client'

// Design Ref: §4.3 Realtime — attendance_logs 변경 구독
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { attendanceService } from '../services'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAttendanceStore } from '@/store/attendanceStore'
import type { AttendanceStatus } from '@/types'

const KEY = 'attendance'

export function useTodayAttendance() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [KEY, 'today', user?.id],
    queryFn: () => (user ? attendanceService.getToday(user.id) : null),
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

export function useServerIp() {
  return useQuery({
    queryKey: [KEY, 'ip'],
    queryFn: () => attendanceService.fetchServerIp(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useSetAttendanceStatus() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const setStoreStatus = useAttendanceStore((s) => s.setStatus)

  return useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      if (!user) throw new Error('Not authenticated')
      let ip: string | null = null
      let isOffice = false
      try {
        const info = await attendanceService.fetchServerIp()
        ip = info.ip
        isOffice = info.isOffice
      } catch {
        // IP 조회 실패여도 등록은 허용 (외부망일 수 있음)
      }
      const log = await attendanceService.upsertStatus({
        userId: user.id,
        status,
        ip,
        isOffice: status === 'office' ? isOffice : false,
      })
      return { log, ip, isOffice }
    },
    onSuccess: ({ log }) => {
      setStoreStatus(log.status)
      qc.invalidateQueries({ queryKey: [KEY] })
    },
  })
}

export function useAttendanceRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          qc.invalidateQueries({ queryKey: [KEY] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
