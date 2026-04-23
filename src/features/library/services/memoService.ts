// Design Ref: §5 — Personal Memos(개인 메모) — team_id 없음, 공유 없음
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import type { PersonalMemo, PersonalMemoInsert, PersonalMemoUpdate } from '@/types'

export interface MemoListFilter {
  search?: string
}

export const memoService = {
  async list(filter: MemoListFilter = {}): Promise<PersonalMemo[]> {
    const supabase = createClient()
    let query = supabase.from('personal_memos').select('*')
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<PersonalMemo | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('personal_memos')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(
    input: Omit<PersonalMemoInsert, 'owner_user_id'>
  ): Promise<PersonalMemo> {
    const supabase = createClient()
    const { userId } = await getOwnerContext()
    const { data, error } = await supabase
      .from('personal_memos')
      .insert({ ...input, owner_user_id: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: PersonalMemoUpdate): Promise<PersonalMemo> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('personal_memos')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('personal_memos').delete().eq('id', id)
    if (error) throw error
  },
}
