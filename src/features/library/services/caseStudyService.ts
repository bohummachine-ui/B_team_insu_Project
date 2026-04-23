// Design Ref: §5 — Case Studies(성공/실패 사례)
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import type { CaseStudy, CaseStudyInsert, CaseStudyUpdate } from '@/types'

export interface CaseStudyListFilter {
  search?: string
  outcome?: 'success' | 'fail' | null
  isShared?: boolean | null
}

export const caseStudyService = {
  async list(filter: CaseStudyListFilter = {}): Promise<CaseStudy[]> {
    const supabase = createClient()
    let query = supabase.from('case_studies').select('*')

    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`)
    }
    if (filter.outcome) query = query.eq('outcome', filter.outcome)
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<CaseStudy | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(
    input: Omit<CaseStudyInsert, 'owner_user_id' | 'team_id'>
  ): Promise<CaseStudy> {
    const supabase = createClient()
    const { userId, teamId } = await getOwnerContext()
    const { data, error } = await supabase
      .from('case_studies')
      .insert({ ...input, owner_user_id: userId, team_id: teamId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: CaseStudyUpdate): Promise<CaseStudy> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('case_studies')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('case_studies').delete().eq('id', id)
    if (error) throw error
  },

  async setShared(id: string, isShared: boolean): Promise<CaseStudy> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('case_studies')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
