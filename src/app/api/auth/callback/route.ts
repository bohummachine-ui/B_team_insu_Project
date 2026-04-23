import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const userId = data.session.user.id
      const email = data.session.user.email ?? ''
      const fullName = data.session.user.user_metadata?.full_name ?? ''
      const avatarUrl = data.session.user.user_metadata?.avatar_url ?? null

      // Upsert user record — new users get status=pending
      const { data: existingUser } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single()

      if (!existingUser) {
        await supabase.from('users').insert({
          id: userId,
          email,
          name: fullName,
          profile_image_url: avatarUrl,
          status: 'pending',
          role: 'member',
        })
      }

      // Re-check status to route correctly
      const { data: user } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single()

      if (!user || user.status === 'pending') {
        return NextResponse.redirect(`${origin}/pending`)
      }
      if (user.status === 'rejected' || user.status === 'suspended') {
        return NextResponse.redirect(`${origin}/rejected`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
