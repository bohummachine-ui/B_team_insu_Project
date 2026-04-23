// Design Ref: §5.4 개인 설정 — 프로필, 이메일, 역할, 가입일 조회 (읽기 전용 v1.0)
'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { authService } from '@/features/auth/services/authService'

export default function SettingsPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="p-8 text-gray-400">불러오는 중...</div>
  if (!user) return <div className="p-8 text-gray-400">로그인이 필요합니다.</div>

  const statusLabel = {
    pending: '승인 대기', active: '활성', rejected: '반려됨', suspended: '비활성화',
  }[user.status] ?? user.status
  const roleLabel = user.role === 'admin' ? '팀장 (admin)' : '팀원 (member)'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">내 설정</h1>

      <section className="bg-white rounded-toss border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">프로필</h2>
        <div className="flex items-center gap-4 mb-4">
          {user.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profile_image_url} alt={user.name ?? ''} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-bold">
              {(user.name ?? '?').slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-gray-900">{user.name ?? '이름 없음'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <dt className="text-gray-500">역할</dt>
          <dd className="col-span-2 text-gray-900">{roleLabel}</dd>
          <dt className="text-gray-500">상태</dt>
          <dd className="col-span-2 text-gray-900">{statusLabel}</dd>
          <dt className="text-gray-500">가입일</dt>
          <dd className="col-span-2 text-gray-900">{new Date(user.created_at).toLocaleDateString('ko-KR')}</dd>
          {user.approved_at && (
            <>
              <dt className="text-gray-500">승인일</dt>
              <dd className="col-span-2 text-gray-900">{new Date(user.approved_at).toLocaleDateString('ko-KR')}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="bg-white rounded-toss border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-2">알림</h2>
        <p className="text-sm text-gray-500">
          알림 설정은 v1.1에서 제공될 예정입니다.
        </p>
      </section>

      <section className="bg-white rounded-toss border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">계정</h2>
        <button
          onClick={() => authService.signOut()}
          className="text-sm px-4 py-2 rounded-toss border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </section>

      {user.role === 'admin' && (
        <p className="text-xs text-gray-400 mt-4">
          팀원 관리는 사이드바 <strong>팀원 관리</strong>에서 진행하세요.
        </p>
      )}
    </div>
  )
}
