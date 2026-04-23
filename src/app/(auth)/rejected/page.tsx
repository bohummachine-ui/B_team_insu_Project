import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RejectedPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('status, name')
    .eq('id', session.user.id)
    .single()

  if (user?.status === 'active') {
    redirect('/dashboard')
  }

  const displayName = user?.name || session.user.user_metadata?.full_name || session.user.email

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="card text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" stroke="#F04452" strokeWidth="2.5" />
              <path d="M11 11l10 10M21 11l-10 10" stroke="#F04452" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {user?.status === 'suspended' ? '계정 정지됨' : '접근 거부됨'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            <span className="font-medium text-gray-700">{displayName}</span>님의<br />
            {user?.status === 'suspended'
              ? '계정이 일시 정지되었습니다'
              : '접근 신청이 승인되지 않았습니다'}
          </p>

          <div className="bg-gray-50 rounded-toss px-4 py-3 text-left mb-6">
            <p className="text-xs text-gray-500 mb-1">로그인 계정</p>
            <p className="text-sm font-medium text-gray-800">{session.user.email}</p>
          </div>

          <p className="text-xs text-gray-400">
            문의사항은 시스템 관리자에게 연락해주세요
          </p>
        </div>

        <LogoutButton />
      </div>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/api/auth/signout" method="post" className="mt-4 text-center">
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        다른 계정으로 로그인
      </button>
    </form>
  )
}
