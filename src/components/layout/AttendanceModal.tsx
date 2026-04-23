'use client'

// Design Ref: §5.1 출근 상태 모달 — IP 검증 + upsert(UNIQUE user_id+date)
import { useState } from 'react'
import { useAttendanceStore } from '@/store/attendanceStore'
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR } from '@/types/attendance'
import { useSetAttendanceStatus, useServerIp } from '@/features/attendance/hooks/useAttendance'
import type { AttendanceStatus } from '@/types'

const STATUS_ORDER: AttendanceStatus[] = [
  'office', 'field', 'remote', 'hospital', 'dayoff', 'vacation', 'checkout',
]

interface Props {
  onClose: () => void
}

export default function AttendanceModal({ onClose }: Props) {
  const { currentStatus } = useAttendanceStore()
  const { data: ipInfo } = useServerIp()
  const setStatus = useSetAttendanceStatus()
  const [warning, setWarning] = useState<string | null>(null)

  const handleSelect = async (status: AttendanceStatus) => {
    setWarning(null)
    if (status === 'office' && ipInfo && !ipInfo.isOffice) {
      setWarning('현재 IP는 등록된 사무실 IP가 아닙니다. 그래도 등록하시겠습니까?')
      // 바로 제출하지 않고 사용자에게 확인 요구
      if (!confirm('사무실 IP가 아닙니다. "사무실 출근"으로 계속 등록하시겠습니까?')) return
    }
    try {
      await setStatus.mutateAsync(status)
      onClose()
    } catch (e) {
      setWarning(e instanceof Error ? e.message : '등록 실패')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-toss-xl shadow-toss-lg p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 mb-2">출근 상태 변경</h3>
        {ipInfo && (
          <p className="text-xs text-gray-500 mb-3">
            현재 IP: <span className="font-mono">{ipInfo.ip}</span>
            {ipInfo.isOffice ? (
              <span className="ml-1 text-green-600">· 사무실</span>
            ) : (
              <span className="ml-1 text-gray-400">· 외부</span>
            )}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              disabled={setStatus.isPending}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-toss text-sm font-medium transition-colors
                ${currentStatus === status
                  ? 'bg-primary-50 text-primary border border-primary-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50`}
            >
              <span className={`w-2 h-2 rounded-full ${ATTENDANCE_STATUS_COLOR[status]}`} />
              {ATTENDANCE_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
        {warning && <p className="text-xs text-red-500 mt-3">{warning}</p>}
      </div>
    </div>
  )
}
