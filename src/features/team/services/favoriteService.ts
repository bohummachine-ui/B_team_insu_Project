// Design Ref: §3.1 — favorites 테이블 (user_id + target_type + target_id)
import { createClient } from '@/lib/supabase/client'
import type { Favorite, FavoriteTarget } from '@/types'

export const favoriteService = {
  async list(): Promise<Favorite[]> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', session.user.id)
    if (error) throw error
    return data ?? []
  },

  async add(targetType: FavoriteTarget, targetId: string): Promise<void> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: session.user.id, target_type: targetType, target_id: targetId })
    if (error && error.code !== '23505') throw error // unique violation 무시
  },

  async remove(targetType: FavoriteTarget, targetId: string): Promise<void> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', session.user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
    if (error) throw error
  },
}
