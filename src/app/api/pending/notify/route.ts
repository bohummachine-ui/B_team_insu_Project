// Design Ref: §5.4 Pending → 팀장에게 알림. v1.0: 서버 rate-limit + 로그 stub. v1.1: Slack/이메일 연동.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const lastNotifyByUser = new Map<string, number>()
const COOLDOWN_MS = 5 * 60 * 1000 // 5분 서버 측 최소 쿨다운

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = Date.now()
  const last = lastNotifyByUser.get(userId) ?? 0
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: Math.ceil((COOLDOWN_MS - (now - last)) / 1000) }, { status: 429 })
  }
  lastNotifyByUser.set(userId, now)

  // TODO(v1.1): Slack/이메일 채널 연동. 현재는 요청 기록만 남김.
  console.info('[pending/notify]', { userId, email: session.user.email, at: new Date(now).toISOString() })

  return NextResponse.json({ ok: true })
}
