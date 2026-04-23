// Design Ref: §5 — Scripts(스크립트) CRUD
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import type { Script, ScriptInsert, ScriptUpdate } from '@/types'

export interface ScriptListFilter {
  search?: string
  tags?: string[]
  isShared?: boolean | null
  sortBy?: 'title' | 'recent'
}

export const scriptService = {
  async list(filter: ScriptListFilter = {}): Promise<Script[]> {
    const supabase = createClient()
    let query = supabase.from('scripts').select('*')

    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`)
    }
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }
    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags)
    }

    const sort = filter.sortBy ?? 'recent'
    if (sort === 'title') query = query.order('title')
    else query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<Script | null> {
    const supabase = createClient()
    const { data, error } = await supabase.from('scripts').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async create(
    input: Omit<ScriptInsert, 'owner_user_id' | 'team_id'>
  ): Promise<Script> {
    const supabase = createClient()
    const { userId, teamId } = await getOwnerContext()
    const { data, error } = await supabase
      .from('scripts')
      .insert({ ...input, owner_user_id: userId, team_id: teamId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: ScriptUpdate): Promise<Script> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('scripts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('scripts').delete().eq('id', id)
    if (error) throw error
  },

  async setShared(id: string, isShared: boolean): Promise<Script> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('scripts')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
