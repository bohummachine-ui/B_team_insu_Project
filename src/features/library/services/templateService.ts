// Design Ref: §5 — Message Templates(메시지 템플릿) CRUD + use_count
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import type { MessageTemplate, MessageTemplateInsert, MessageTemplateUpdate } from '@/types'

export interface TemplateListFilter {
  search?: string
  category?: string | null
  isShared?: boolean | null
  sortBy?: 'title' | 'recent' | 'use_count'
}

export const templateService = {
  async list(filter: TemplateListFilter = {}): Promise<MessageTemplate[]> {
    const supabase = createClient()
    let query = supabase.from('message_templates').select('*')

    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`)
    }
    if (filter.category) {
      query = query.eq('category', filter.category as 'greeting' | 'info' | 'proposal' | 'closing')
    }
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }

    const sort = filter.sortBy ?? 'recent'
    if (sort === 'title') query = query.order('title')
    else if (sort === 'use_count') query = query.order('use_count', { ascending: false })
    else query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<MessageTemplate | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(
    input: Omit<MessageTemplateInsert, 'owner_user_id' | 'team_id'>
  ): Promise<MessageTemplate> {
    const supabase = createClient()
    const { userId, teamId } = await getOwnerContext()
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ ...input, owner_user_id: userId, team_id: teamId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: MessageTemplateUpdate): Promise<MessageTemplate> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('message_templates').delete().eq('id', id)
    if (error) throw error
  },

  async setShared(id: string, isShared: boolean): Promise<MessageTemplate> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 사용 횟수 증가 (카카오톡 공유/복사 시 호출)
  async incrementUseCount(id: string): Promise<void> {
    const supabase = createClient()
    const { data: row } = await supabase
      .from('message_templates')
      .select('use_count')
      .eq('id', id)
      .single()
    const current = row?.use_count ?? 0
    await supabase
      .from('message_templates')
      // use_count는 스키마 Update에서 제외되어 있어 캐스팅으로 우회
      .update({ use_count: current + 1 } as never)
      .eq('id', id)
  },
}
