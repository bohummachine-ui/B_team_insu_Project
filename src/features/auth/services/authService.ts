import { createClient } from '@/lib/supabase/client'
import type { TeamMember } from '@/types'

export const authService = {
  async getCurrentUser(): Promise<TeamMember | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !data) return null
    return data
  },

  async signOut(): Promise<void> {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  },
}
