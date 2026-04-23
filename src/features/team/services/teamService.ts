// Design Ref: §3.4, §4 — 팀원 목록/상세 (같은 team_id 내 RLS 허용)
import { createClient } from '@/lib/supabase/client'
import type {
  TeamMember,
  TeamMemberWithAttendance,
  Contact,
  Script,
  MessageTemplate,
  ImageAsset,
  Recording,
  CaseStudy,
} from '@/types'
import { previewMaskedContact } from '@/features/contacts/utils/maskContact'

export interface TeamMemberListFilter {
  search?: string
  role?: 'member' | 'admin' | null
  sortBy?: 'name' | 'shared_count' | 'attendance' | 'joined'
}

export const teamService = {
  async list(filter: TeamMemberListFilter = {}): Promise<TeamMemberWithAttendance[]> {
    const supabase = createClient()
    let query = supabase.from('users').select('*').eq('status', 'active')

    if (filter.search) {
      query = query.ilike('name', `%${filter.search}%`)
    }
    if (filter.role) query = query.eq('role', filter.role)

    const { data: members, error } = await query
    if (error) throw error

    // 오늘 근태 상태 조회 (팀 전체 한 번에)
    const today = new Date().toISOString().slice(0, 10)
    const userIds = (members ?? []).map((m) => m.id)
    const { data: att } = userIds.length
      ? await supabase
          .from('attendance_logs')
          .select('user_id,status')
          .in('user_id', userIds)
          .eq('date', today)
      : { data: [] }
    const attMap = new Map<string, TeamMemberWithAttendance['todayAttendance']>()
    for (const a of att ?? []) attMap.set(a.user_id, a.status)

    // 공개 고객 수 (is_shared=true) — 각 owner_user_id별 count
    const contactCounts = new Map<string, number>()
    if (userIds.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('owner_user_id')
        .eq('is_shared', true)
        .in('owner_user_id', userIds)
      for (const c of contacts ?? []) {
        contactCounts.set(c.owner_user_id, (contactCounts.get(c.owner_user_id) ?? 0) + 1)
      }
    }

    // 공유 자료 수 (5개 테이블 합산)
    const sharedCounts = new Map<string, number>()
    if (userIds.length > 0) {
      const tables: Array<'scripts' | 'message_templates' | 'image_assets' | 'recordings' | 'case_studies'> =
        ['scripts', 'message_templates', 'image_assets', 'recordings', 'case_studies']
      for (const t of tables) {
        const { data: rows } = await supabase
          .from(t)
          .select('owner_user_id')
          .eq('is_shared', true)
          .in('owner_user_id', userIds)
        for (const r of rows ?? []) {
          sharedCounts.set(r.owner_user_id, (sharedCounts.get(r.owner_user_id) ?? 0) + 1)
        }
      }
    }

    const enriched: TeamMemberWithAttendance[] = (members ?? []).map((m) => ({
      ...m,
      todayAttendance: attMap.get(m.id) ?? null,
      publicContactCount: contactCounts.get(m.id) ?? 0,
      sharedResourceCount: sharedCounts.get(m.id) ?? 0,
    }))

    const sort = filter.sortBy ?? 'name'
    if (sort === 'name') enriched.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    else if (sort === 'shared_count')
      enriched.sort((a, b) => b.sharedResourceCount - a.sharedResourceCount)
    else if (sort === 'attendance')
      enriched.sort((a, b) => (a.todayAttendance ?? '').localeCompare(b.todayAttendance ?? ''))
    else if (sort === 'joined')
      enriched.sort((a, b) => a.created_at.localeCompare(b.created_at))

    return enriched
  },

  async get(userId: string): Promise<TeamMember | null> {
    const supabase = createClient()
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (error) return null
    return data
  },

  async getPublicContacts(userId: string): Promise<Contact[]> {
    const supabase = createClient()
    // RLS가 같은 team_id + is_shared=true만 허용
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('name')
    if (error) throw error
    // 마스킹된 형태로 변환
    return (data ?? []).map((c) => {
      const masked = previewMaskedContact(c)
      return {
        ...c,
        name: masked.name,
        phone: masked.phone,
        email: null,
        address: null,
        memo: null,
        weight: null,
        height: null,
        family_info: null,
        job_detail: masked.job_detail,
      } as Contact
    })
  },

  async getSharedScripts(userId: string): Promise<Script[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSharedTemplates(userId: string): Promise<MessageTemplate[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSharedImages(userId: string): Promise<ImageAsset[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('image_assets')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSharedRecordings(userId: string): Promise<Recording[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSharedCases(userId: string): Promise<CaseStudy[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
}
