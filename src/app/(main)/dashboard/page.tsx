// Design Ref: §5.1 대시보드 — 요약 위젯 (공지/근태/자료/고객)
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { usePosts } from '@/features/board/hooks/useBoard'
import { useMonthlyTeamAttendance } from '@/features/attendance/hooks/useMonthlyAttendance'
import { useCaseStudies } from '@/features/library/hooks/useCaseStudies'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: myContacts } = useContacts({})
  const { data: sharedContacts } = useContacts({ isShared: true })
  const { data: notices } = usePosts({ category: 'notice' })
  const { data: caseStudies } = useCaseStudies({ isShared: true })

  const now = new Date()
  const { data: monthly } = useMonthlyTeamAttendance({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })

  const todayStr = useMemo(() => {
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [now])

  const todayPresent = useMemo(() => {
    if (!monthly) return 0
    const set = new Set<string>()
    for (const row of monthly) {
      if (row.date === todayStr && (row.status === 'office' || row.status === 'field')) {
        set.add(row.user_id)
      }
    }
    return set.size
  }, [monthly, todayStr])

  const latestNotices = (notices ?? []).slice(0, 5)
  const latestShared = (caseStudies ?? []).slice(0, 5)

  const stats = [
    { label: '내 고객', value: myContacts?.length ?? 0, sub: '총 고객 수', href: '/contacts' },
    { label: '공유 고객', value: sharedContacts?.length ?? 0, sub: '팀 공유 중', href: '/contacts?shared=1' },
    { label: '오늘 출근', value: todayPresent, sub: '팀원 (사무실/외근)', href: '/attendance' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">
          안녕하세요, {user?.name ?? ''}님
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-toss border border-gray-100 p-5 hover:border-primary-200 hover:shadow-sm transition"
          >
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white rounded-toss border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">최신 공지</h2>
            <Link href="/board" className="text-xs text-primary hover:underline">모두 보기</Link>
          </div>
          {latestNotices.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">공지가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {latestNotices.map((p) => (
                <li key={p.id}>
                  <Link href={`/board/${p.id}`} className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <span className="text-sm text-gray-800 truncate flex items-center gap-2">
                      {p.is_pinned && <span className="text-primary text-xs">📌</span>}
                      {p.title}
                    </span>
                    <span className="text-xs text-gray-400 ml-3 shrink-0">
                      {new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-toss border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">최근 공유 자료</h2>
            <Link href="/hub" className="text-xs text-primary hover:underline">Hub 열기</Link>
          </div>
          {latestShared.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">공유된 자료가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {latestShared.map((c) => (
                <li key={c.id}>
                  <Link href="/library" className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <span className="text-sm text-gray-800 truncate">{c.title}</span>
                    <span className={`text-xs ml-3 shrink-0 ${c.outcome === 'success' ? 'text-green-600' : c.outcome === 'fail' ? 'text-red-500' : 'text-gray-400'}`}>
                      {c.outcome === 'success' ? '성공' : c.outcome === 'fail' ? '실패' : '-'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/contacts', label: '고객 관리' },
          { href: '/library', label: '자료실' },
          { href: '/hub', label: '통합 Hub' },
          { href: '/attendance', label: '근태 센터' },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="bg-white rounded-toss border border-gray-100 px-4 py-3 text-sm text-gray-700 hover:border-primary-200 hover:text-primary text-center"
          >
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
