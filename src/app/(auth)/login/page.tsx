import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6 shadow-toss-md">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M8 12C8 7.58 11.58 4 16 4s8 3.58 8 8v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2h2v-2z"
                fill="white"
                fillOpacity="0.9"
              />
              <circle cx="16" cy="19" r="2.5" fill="white" fillOpacity="0.6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">백지운지점 팀 CRM</h1>
          <p className="text-gray-500 text-sm">팀원 전용 고객 관리 시스템</p>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-gray-400 mt-8">
          로그인 후 팀장 승인이 필요합니다
        </p>
      </div>
    </div>
  )
}
