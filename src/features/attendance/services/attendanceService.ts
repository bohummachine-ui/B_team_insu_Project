// Design Ref: §3 attendance_logs, office_ips — 근태 로그 조회/저장 + 사무실 IP 관리
import { createClient } from '@/lib/supabase/client'
import type { AttendanceLog, AttendanceStatus } from '@/types'

export interface MonthlyRangeInput {
  year: number
  month: number // 1-12
}

export interface OfficeIp {
  id: string
  team_id: string
  ip_address: string
  label: string | null
  created_by: string
  created_at: string
}

function monthRange({ year, month }: MonthlyRangeInput): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${pad(nextMonth)}-01`
  return { from, to }
}

export const attendanceService = {
  async fetchServerIp(): Promise<{ ip: string; isOffice: boolean }> {
    const res = await fetch('/api/attendance/ip', { cache: 'no-store' })
    if (!res.ok) throw new Error('IP 조회 실패')
    return res.json()
  },

  async getToday(userId: string): Promise<AttendanceLog | null> {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsertStatus(args: {
    userId: string
    status: AttendanceStatus
    ip: string | null
    isOffice: boolean
  }): Promise<AttendanceLog> {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('attendance_logs')
      .upsert(
        {
          user_id: args.userId,
          date: today,
          status: args.status,
          ip_address: args.ip,
          is_office: args.isOffice,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()
    if (error) throw error
    return data as AttendanceLog
  },

  async listMonthly(input: MonthlyRangeInput, userIds?: string[]): Promise<AttendanceLog[]> {
    const supabase = createClient()
    const { from, to } = monthRange(input)
    let q = supabase
      .from('attendance_logs')
      .select('*')
      .gte('date', from)
      .lt('date', to)
    if (userIds && userIds.length > 0) q = q.in('user_id', userIds)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as AttendanceLog[]
  },

  async listMine(input: MonthlyRangeInput, userId: string): Promise<AttendanceLog[]> {
    const supabase = createClient()
    const { from, to } = monthRange(input)
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lt('date', to)
      .order('date', { ascending: true })
    if (error) throw error
    return (data ?? []) as AttendanceLog[]
  },

  async listOfficeIps(): Promise<OfficeIp[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('office_ips')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as OfficeIp[]
  },

  async addOfficeIp(ipAddress: string, label: string | null): Promise<void> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const { data: user } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', session.user.id)
      .single()
    if (!user?.team_id) throw new Error('팀 정보가 없습니다')
    const { error } = await supabase.from('office_ips').insert({
      team_id: user.team_id,
      ip_address: ipAddress,
      label,
      created_by: session.user.id,
    })
    if (error) throw error
  },

  async removeOfficeIp(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('office_ips').delete().eq('id', id)
    if (error) throw error
  },
}
