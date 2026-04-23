// Design Ref: §4 — Contact CRUD via Supabase (RLS로 권한 강제)
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactInsert, ContactUpdate, ContactWithLabels, Label } from '@/types'

export interface ContactListFilter {
  search?: string
  labelIds?: string[]
  isShared?: boolean | null
  sortBy?: 'name' | 'recent' | 'next_contact'
}

export const contactService = {
  async list(filter: ContactListFilter = {}): Promise<Contact[]> {
    const supabase = createClient()
    let query = supabase.from('contacts').select('*')

    if (filter.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,phone.ilike.%${filter.search}%,memo.ilike.%${filter.search}%`
      )
    }
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }

    const sort = filter.sortBy ?? 'name'
    if (sort === 'name') query = query.order('name')
    else if (sort === 'recent') query = query.order('updated_at', { ascending: false })
    else if (sort === 'next_contact') query = query.order('next_contact_date', { nullsFirst: false })

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<ContactWithLabels | null> {
    const supabase = createClient()
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !contact) return null

    const { data: links } = await supabase
      .from('contact_labels')
      .select('label_id')
      .eq('contact_id', id)

    const labelIds = (links ?? []).map((l) => l.label_id)
    let labels: Label[] = []
    if (labelIds.length > 0) {
      const { data: labelRows } = await supabase
        .from('labels')
        .select('*')
        .in('id', labelIds)
      labels = labelRows ?? []
    }

    return { ...contact, labels }
  },

  async create(input: Omit<ContactInsert, 'owner_user_id' | 'team_id'>): Promise<Contact> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { data: user } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', session.user.id)
      .single()
    if (!user?.team_id) throw new Error('Team not assigned')

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...input,
        owner_user_id: session.user.id,
        team_id: user.team_id,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, patch: ContactUpdate): Promise<Contact> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error
  },

  async setShared(id: string, isShared: boolean): Promise<Contact> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .update({
        is_shared: isShared,
        shared_at: isShared ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async bulkSetShared(ids: string[], isShared: boolean): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('contacts')
      .update({
        is_shared: isShared,
        shared_at: isShared ? new Date().toISOString() : null,
      })
      .in('id', ids)
    if (error) throw error
  },
}
