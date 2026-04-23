import type { Database, AttendanceStatus } from './database.types'

export type { AttendanceStatus }
export type AttendanceLog = Database['public']['Tables']['attendance_logs']['Row']

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  office: '사무실 출근',
  field: '외근',
  remote: '재택',
  hospital: '병원',
  dayoff: '휴무',
  vacation: '휴가',
  checkout: '퇴근',
}

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  office: 'bg-green-500',
  field: 'bg-yellow-500',
  remote: 'bg-blue-500',
  hospital: 'bg-orange-500',
  dayoff: 'bg-gray-300',
  vacation: 'bg-purple-500',
  checkout: 'bg-gray-700',
}
