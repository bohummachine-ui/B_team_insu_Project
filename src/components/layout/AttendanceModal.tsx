'use client'

import { useAttendanceStore } from '@/store/attendanceStore'
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR } from '@/types/attendance'
import { createClient } from '@/lib/supabase/client'
import type { AttendanceStatus } from '@/types'
import { useState } from 'react'

const STATUS_ORDER: AttendanceStatus[] = [
  'office', 'field', 'remote', 'hospital', 'dayoff', 'vacation', 'checkout',
]

interface Props {
  onClose: () => void
}

export default function AttendanceModal({ onClose }: Props) {
  const { currentStatus, setStatus } = useAttendanceStore()
  const [loading, setLoading] = useState(false)

  const handleSelect = async (status: AttendanceStatus) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      const today = new Date().toISOString().slice(0, 10)
      await supabase.from('attendance_logs').insert({
        user_id: session.user.id,
        date: today,
        status,
        is_office: false,
      })
    }

    setStatus(status)
    setLoading(false)
    onClose()
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
        <h3 className="font-bold text-gray-900 mb-4">출근 상태 변경</h3>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              disabled={loading}
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
      </div>
    </div>
  )
}
