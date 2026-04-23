// Design Ref: §3.4 §5 — 팀 통합 자료 Hub (5종 공유 자료 한 목록)
import { createClient } from '@/lib/supabase/client'
import type { HubFilter, HubItem } from '@/types'

const DATE_RANGE_DAYS: Record<NonNullable<HubFilter['dateRange']>, number | null> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  all: null,
}

function dateFrom(range: HubFilter['dateRange']): string | null {
  const days = range ? DATE_RANGE_DAYS[range] : null
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const hubService = {
  async list(filter: HubFilter = {}): Promise<HubItem[]> {
    const supabase = createClient()
    const since = dateFrom(filter.dateRange)
    const search = filter.search?.trim()
    const authorFilter = filter.authorIds && filter.authorIds.length > 0 ? filter.authorIds : null

    const tab = filter.tab ?? 'all'
    const types = tab === 'all' ? ['script', 'template', 'image', 'recording', 'case'] : [tab]

    const items: HubItem[] = []

    // owner 이름 매핑용
    const userMap = new Map<string, string | null>()
    const collectOwners = async (ids: string[]) => {
      const missing = ids.filter((id) => !userMap.has(id))
      if (missing.length === 0) return
      const { data } = await supabase.from('users').select('id,name').in('id', missing)
      for (const u of data ?? []) userMap.set(u.id, u.name)
    }

    if (types.includes('script')) {
      let q = supabase.from('scripts').select('*').eq('is_shared', true)
      if (since) q = q.gte('created_at', since)
      if (authorFilter) q = q.in('owner_user_id', authorFilter)
      if (search) q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
      const { data } = await q.order('created_at', { ascending: false }).limit(200)
      await collectOwners((data ?? []).map((r) => r.owner_user_id))
      for (const r of data ?? []) {
        items.push({
          id: r.id,
          type: 'script',
          title: r.title,
          body: r.body,
          ownerUserId: r.owner_user_id,
          ownerName: userMap.get(r.owner_user_id) ?? null,
          createdAt: r.created_at,
          tags: r.tags,
        })
      }
    }

    if (types.includes('template')) {
      let q = supabase.from('message_templates').select('*').eq('is_shared', true)
      if (since) q = q.gte('created_at', since)
      if (authorFilter) q = q.in('owner_user_id', authorFilter)
      if (search) q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
      const { data } = await q.order('created_at', { ascending: false }).limit(200)
      await collectOwners((data ?? []).map((r) => r.owner_user_id))
      for (const r of data ?? []) {
        items.push({
          id: r.id,
          type: 'template',
          title: r.title,
          body: r.body,
          ownerUserId: r.owner_user_id,
          ownerName: userMap.get(r.owner_user_id) ?? null,
          createdAt: r.created_at,
          category: r.category,
          useCount: r.use_count,
        })
      }
    }

    if (types.includes('image')) {
      let q = supabase.from('image_assets').select('*').eq('is_shared', true)
      if (since) q = q.gte('created_at', since)
      if (authorFilter) q = q.in('owner_user_id', authorFilter)
      if (search) q = q.ilike('title', `%${search}%`)
      const { data } = await q.order('created_at', { ascending: false }).limit(200)
      await collectOwners((data ?? []).map((r) => r.owner_user_id))
      for (const r of data ?? []) {
        items.push({
          id: r.id,
          type: 'image',
          title: r.title,
          body: null,
          ownerUserId: r.owner_user_id,
          ownerName: userMap.get(r.owner_user_id) ?? null,
          createdAt: r.created_at,
          storagePath: r.storage_path,
          tags: r.tags,
          useCount: r.use_count,
        })
      }
    }

    if (types.includes('recording')) {
      let q = supabase.from('recordings').select('*').eq('is_shared', true)
      if (since) q = q.gte('created_at', since)
      if (authorFilter) q = q.in('owner_user_id', authorFilter)
      if (search) q = q.ilike('title', `%${search}%`)
      const { data } = await q.order('created_at', { ascending: false }).limit(200)
      await collectOwners((data ?? []).map((r) => r.owner_user_id))
      for (const r of data ?? []) {
        items.push({
          id: r.id,
          type: 'recording',
          title: r.title,
          body: null,
          ownerUserId: r.owner_user_id,
          ownerName: userMap.get(r.owner_user_id) ?? null,
          createdAt: r.created_at,
          driveShareLink: r.drive_share_link,
        })
      }
    }

    if (types.includes('case')) {
      let q = supabase.from('case_studies').select('*').eq('is_shared', true)
      if (since) q = q.gte('created_at', since)
      if (authorFilter) q = q.in('owner_user_id', authorFilter)
      if (search) q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
      const { data } = await q.order('created_at', { ascending: false }).limit(200)
      await collectOwners((data ?? []).map((r) => r.owner_user_id))
      for (const r of data ?? []) {
        items.push({
          id: r.id,
          type: 'case',
          title: r.title,
          body: r.body,
          ownerUserId: r.owner_user_id,
          ownerName: userMap.get(r.owner_user_id) ?? null,
          createdAt: r.created_at,
          outcome: r.outcome,
        })
      }
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return items
  },
}
