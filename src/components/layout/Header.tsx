'use client'

// Design Ref: §3.2 Header.tsx — AttendanceModal 제거, AttendanceStatusBar로 교체
import { useAuth } from '@/features/auth/hooks/useAuth'
import AttendanceStatusBar from './AttendanceStatusBar'

export default function Header() {
  const { user } = useAuth()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100"
      style={{ height: 'var(--header-height)' }}
    >
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-3">
          <span
            className="font-bold text-gray-900 text-base"
            style={{ marginLeft: 'var(--sidebar-width)' }}
          >
            백지운지점 CRM
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* 출근 상태 인라인 버튼 바 */}
          <AttendanceStatusBar />

          {/* 프로필 */}
          <div className="flex items-center gap-2">
            {user?.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user.name ?? ''}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {user?.name?.charAt(0) ?? '?'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-800 hidden md:block">
              {user?.name ?? ''}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
