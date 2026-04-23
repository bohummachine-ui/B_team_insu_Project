'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAttendanceStore } from '@/store/attendanceStore'
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR } from '@/types/attendance'
import { useTodayAttendance } from '@/features/attendance/hooks/useAttendance'
import AttendanceModal from './AttendanceModal'
import { useEffect, useState } from 'react'

export default function Header() {
  const { user } = useAuth()
  const { currentStatus, setStatus } = useAttendanceStore()
  const { data: today } = useTodayAttendance()
  const [showAttendance, setShowAttendance] = useState(false)

  useEffect(() => {
    if (today?.status && today.status !== currentStatus) {
      setStatus(today.status)
    }
  }, [today, currentStatus, setStatus])

  const statusColor = currentStatus ? ATTENDANCE_STATUS_COLOR[currentStatus] : 'bg-gray-300'
  const statusLabel = currentStatus ? ATTENDANCE_STATUS_LABEL[currentStatus] : '미설정'

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100"
        style={{ height: 'var(--header-height)' }}
      >
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-3">
            <span
              className="font-bold text-gray-900 text-base"
              style={{ marginLeft: 'var(--sidebar-width)' }}
            >
              백지운지점 CRM
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 출근 상태 버튼 */}
            <button
              onClick={() => setShowAttendance(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-sm font-medium text-gray-700">{statusLabel}</span>
            </button>

            {/* 프로필 */}
            <div className="flex items-center gap-2">
              {user?.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt={user.name ?? ''}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {user?.name?.charAt(0) ?? '?'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-800 hidden md:block">
                {user?.name ?? ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {showAttendance && (
        <AttendanceModal onClose={() => setShowAttendance(false)} />
      )}
    </>
  )
}
