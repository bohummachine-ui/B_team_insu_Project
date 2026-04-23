'use client'

// Design Ref: §5.7 개인 월간 근태 리포트 카드
import { useMonthlyMineAttendance } from '../hooks/useMonthlyAttendance'
import { ATTENDANCE_STATUS_LABEL, ATTENDANCE_STATUS_COLOR } from '@/types/attendance'
import type { AttendanceStatus } from '@/types'

const STATUSES: AttendanceStatus[] = [
  'office', 'field', 'remote', 'hospital', 'dayoff', 'vacation', 'checkout',
]

export default function PersonalAttendanceReport({
  year,
  month,
}: {
  year: number
  month: number
}) {
  const { data, isLoading } = useMonthlyMineAttendance({ year, month })

  const counts = STATUSES.reduce<Record<AttendanceStatus, number>>(
    (acc, s) => {
      acc[s] = 0
      return acc
    },
    {} as Record<AttendanceStatus, number>
  )
  for (const l of data ?? []) counts[l.status as AttendanceStatus] = (counts[l.status as AttendanceStatus] ?? 0) + 1
  const total = (data ?? []).length

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">
          내 {year}년 {month}월 근태
        </h3>
        <span className="text-xs text-gray-500">총 {total}일 등록</span>
      </div>
      {isLoading ? (
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-toss"
            >
              <span className={`w-2 h-2 rounded-full ${ATTENDANCE_STATUS_COLOR[s]}`} />
              <span className="text-xs text-gray-600 flex-1">{ATTENDANCE_STATUS_LABEL[s]}</span>
              <span className="text-sm font-bold text-gray-900">{counts[s]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
