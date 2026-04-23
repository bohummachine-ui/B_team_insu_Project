import type { Database, UserRole, UserStatus, AttendanceStatus, FavoriteTarget } from './database.types'

export type { UserRole, UserStatus, FavoriteTarget }
export type TeamMember = Database['public']['Tables']['users']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type FavoriteInsert = Database['public']['Tables']['favorites']['Insert']

export interface TeamMemberWithAttendance extends TeamMember {
  todayAttendance: AttendanceStatus | null
  publicContactCount: number
  sharedResourceCount: number
}

// Hub 통합 아이템 — 6종류 공유 자료를 한 목록에서 표시
export type HubItemType = 'script' | 'template' | 'image' | 'recording' | 'case'

export interface HubItem {
  id: string
  type: HubItemType
  title: string
  body: string | null
  ownerUserId: string
  ownerName: string | null
  createdAt: string
  // type별 메타
  category?: string | null // template
  outcome?: 'success' | 'fail' | null // case
  storagePath?: string | null // image
  driveShareLink?: string | null // recording
  useCount?: number | null
  tags?: string[] | null
}

export type HubTab = 'all' | HubItemType

export interface HubFilter {
  tab?: HubTab
  search?: string
  authorIds?: string[]
  dateRange?: '1w' | '1m' | '3m' | 'all'
  favoritesOnly?: boolean
}
