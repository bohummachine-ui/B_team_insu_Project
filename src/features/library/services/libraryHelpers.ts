// Design Ref: §4 — team_id/owner_user_id 자동 주입 헬퍼
import { createClient } from '@/lib/supabase/client'

export async function getOwnerContext() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', session.user.id)
    .single()
  if (!user?.team_id) throw new Error('Team not assigned')

  return { userId: session.user.id, teamId: user.team_id }
}
