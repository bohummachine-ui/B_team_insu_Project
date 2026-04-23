// Design Ref: §5 — Recordings(녹취록): Drive 연동은 placeholder (metadata만 저장)
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import type { Recording, RecordingInsert, RecordingUpdate } from '@/types'

export interface RecordingListFilter {
  search?: string
  isShared?: boolean | null
}

export const recordingService = {
  async list(filter: RecordingListFilter = {}): Promise<Recording[]> {
    const supabase = createClient()
    let query = supabase.from('recordings').select('*')

    if (filter.search) query = query.ilike('title', `%${filter.search}%`)
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<Recording | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(
    input: Omit<RecordingInsert, 'owner_user_id' | 'team_id'>
  ): Promise<Recording> {
    if (!input.consent_confirmed) {
      throw new Error('녹음 동의 확인이 필요합니다')
    }
    const supabase = createClient()
    const { userId, teamId } = await getOwnerContext()
    const { data, error } = await supabase
      .from('recordings')
      .insert({ ...input, owner_user_id: userId, team_id: teamId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: RecordingUpdate): Promise<Recording> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recordings')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('recordings').delete().eq('id', id)
    if (error) throw error
  },

  async setShared(id: string, isShared: boolean): Promise<Recording> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('recordings')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
