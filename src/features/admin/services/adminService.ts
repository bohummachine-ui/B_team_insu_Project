// Design Ref: §5.4 설정 - 팀원 관리 (admin only)
import { createClient } from '@/lib/supabase/client'
import type { TeamMember, UserRole, UserStatus } from '@/types'

export interface MemberListFilter {
  status?: UserStatus
  search?: string
}

export const adminService = {
  async listMembers(filter: MemberListFilter = {}): Promise<TeamMember[]> {
    const supabase = createClient()
    let query = supabase.from('users').select('*').order('created_at', { ascending: false })

    if (filter.status) query = query.eq('status', filter.status)
    if (filter.search) query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%`)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async countByStatus(): Promise<Record<UserStatus, number>> {
    const supabase = createClient()
    const { data, error } = await supabase.from('users').select('status')
    if (error) throw error
    const result: Record<UserStatus, number> = {
      pending: 0,
      active: 0,
      rejected: 0,
      suspended: 0,
    }
    for (const u of data ?? []) {
      if (u.status in result) result[u.status as UserStatus]++
    }
    return result
  },

  async approveMany(
    userIds: string[],
    role: UserRole,
    approvedByUserId: string,
    teamId: string
  ): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({
        status: 'active',
        role,
        team_id: teamId,
        approved_at: new Date().toISOString(),
        approved_by_user_id: approvedByUserId,
      })
      .in('id', userIds)
    if (error) throw error
  },

  async rejectMany(userIds: string[]): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ status: 'rejected' })
      .in('id', userIds)
    if (error) throw error
  },

  async changeRole(userId: string, role: UserRole): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) throw error
  },

  async suspend(userId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ status: 'suspended' })
      .eq('id', userId)
    if (error) throw error
  },

  async reactivate(userId: string, teamId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ status: 'active', team_id: teamId })
      .eq('id', userId)
    if (error) throw error
  },
}
