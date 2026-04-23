import type { Database, UserRole, UserStatus, AttendanceStatus } from './database.types'

export type { UserRole, UserStatus }
export type TeamMember = Database['public']['Tables']['users']['Row']

export interface TeamMemberWithAttendance extends TeamMember {
  todayAttendance: AttendanceStatus | null
  publicContactCount: number
  sharedResourceCount: number
}
