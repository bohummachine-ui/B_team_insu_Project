'use client'

// Design Ref: §3.1 AttendanceStatusBar — Option B, 헤더 인라인 7버튼
// Plan SC-1: 7개 버튼 헤더 1줄, SC-2: 1클릭 즉시 상태 변경, SC-4: IP 검증 유지
import { useEffect } from 'react'
import { useAttendanceStore } from '@/store/attendanceStore'
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR } from '@/types/attendance'
import {
  useSetAttendanceStatus,
  useServerIp,
  useTodayAttendance,
} from '@/features/attendance/hooks/useAttendance'
import type { AttendanceStatus } from '@/types'

const STATUS_ORDER: AttendanceStatus[] = [
  'office', 'field', 'remote', 'hospital', 'dayoff', 'vacation', 'checkout',
]

export default function AttendanceStatusBar() {
  const { currentStatus, setStatus } = useAttendanceStore()
  const { data: today } = useTodayAttendance()
  const { data: ipInfo } = useServerIp()
  const setAttendanceStatus = useSetAttendanceStatus()

  // Design Ref: §7 — today 상태 동기화 (Header.tsx에서 이전)
  useEffect(() => {
    if (today?.status && today.status !== currentStatus) {
      setStatus(today.status)
    }
  }, [today, currentStatus, setStatus])

  const handleSelect = async (status: AttendanceStatus) => {
    if (status === 'office' && ipInfo && !ipInfo.isOffice) {
      if (!confirm('사무실 IP가 아닙니다. "사무실 출근"으로 계속 등록하시겠습니까?')) return
    }
    try {
      await setAttendanceStatus.mutateAsync(status)
    } catch (e) {
      alert(e instanceof Error ? e.message : '등록 실패')
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {/* IP 정보 — Design §3.1 */}
      {ipInfo && (
        <span className="text-xs text-gray-400 leading-none">
          <span className="font-mono">{ipInfo.ip}</span>
          {ipInfo.isOffice ? (
            <span className="ml-1 text-green-500">· 사무실</span>
          ) : (
            <span className="ml-1">· 외부</span>
          )}
        </span>
      )}

      {/* 7개 인라인 버튼 — Design §6 */}
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => handleSelect(status)}
            disabled={setAttendanceStatus.isPending}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-toss text-xs font-medium transition-colors
              ${currentStatus === status
                ? 'bg-primary-50 text-primary border border-primary-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ATTENDANCE_STATUS_COLOR[status]}`} />
            {ATTENDANCE_STATUS_LABEL[status]}
          </button>
        ))}
      </div>
    </div>
  )
}
