import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', session.user.id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">
          안녕하세요, {user?.name ?? ''}님
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '내 고객', value: '-', sub: '총 고객 수' },
          { label: '공유 고객', value: '-', sub: '팀 공유 중' },
          { label: '오늘 출근', value: '-', sub: '팀원' },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 card">
        <p className="text-sm text-gray-400 text-center py-8">
          모듈 구현 진행 중입니다
        </p>
      </div>
    </div>
  )
}
