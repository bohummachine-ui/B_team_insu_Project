// Design Ref: §2.3 — Server-side Supabase client for RSC and API routes
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export const createServerSupabaseClient = () => {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 쓰기 무시
          }
        },
      },
    }
  )
}

// service_role 전용 admin 클라이언트.
// @supabase/ssr 를 쓰면 쿠키의 사용자 JWT가 Authorization 헤더를 덮어써서 role=authenticated 로 실행되므로,
// service_role 전용 RPC (get_user_gemini_key 등) 호출이 권한 거부된다.
// 반드시 @supabase/supabase-js 의 순수 createClient 로 만들어 세션 간섭 없이 service_role 로만 동작시킨다.
export const createAdminSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
