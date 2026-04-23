// Design Ref: §2.2 — Auth gate: session없음→/login, pending→/pending, rejected→/rejected
// Plan SC: Google OAuth 로그인 → pending → 팀장 승인 → 서비스 진입 flow 완전 작동
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/pending', '/rejected', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 미인증 → 로그인
  if (!session) {
    if (isPublicPath) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 인증됨 → 사용자 상태 확인
  const { data: user } = await supabase
    .from('users')
    .select('status, role')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    // users 레코드 없으면 (최초 OAuth) pending으로 처리
    if (pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    return supabaseResponse
  }

  if (user.status === 'pending') {
    if (pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    return supabaseResponse
  }

  if (user.status === 'rejected' || user.status === 'suspended') {
    if (pathname !== '/rejected') {
      return NextResponse.redirect(new URL('/rejected', request.url))
    }
    return supabaseResponse
  }

  // active → 로그인/pending 페이지 접근 시 대시보드로
  if (user.status === 'active' && (pathname === '/login' || pathname === '/pending')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // admin-only 경로 가드
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
