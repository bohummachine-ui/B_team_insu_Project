// Design Ref: §4.2 GET /api/attendance/ip — 서버에서만 실제 클라이언트 IP 취득 가능
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const h = headers()
  // Vercel / proxy 체인: x-forwarded-for 최좌측이 실제 클라이언트 IP
  const forwarded = h.get('x-forwarded-for')
  const realIp = h.get('x-real-ip')
  const ip = (forwarded?.split(',')[0] || realIp || '').trim() || 'unknown'

  // 사용자 team_id 로 office_ips 조회하여 isOffice 판정
  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', session.user.id)
    .single()

  let isOffice = false
  if (user?.team_id) {
    const { data: offices } = await supabase
      .from('office_ips')
      .select('ip_address')
      .eq('team_id', user.team_id)
    isOffice = (offices ?? []).some((o) => o.ip_address === ip)
  }

  return NextResponse.json({ ip, isOffice })
}
