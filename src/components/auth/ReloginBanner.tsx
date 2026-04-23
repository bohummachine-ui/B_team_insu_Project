// Design Ref: team-crm-drive.design.md §5.4 — NULL token 감지 + 재로그인 CTA
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReloginBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/drive/has-refresh-token')
      .then((r) => r.json())
      .then((body: { hasToken: boolean; authenticated: boolean }) => {
        if (cancelled) return
        if (body.authenticated && !body.hasToken) setShow(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleRelogin = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/drive.file',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  if (!show || dismissed) return null

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-toss p-4 flex items-start gap-3">
      <div className="flex-1">
        <div className="font-semibold mb-1">Google 재로그인 필요</div>
        <div className="text-xs">
          Drive 업로드 기능 사용을 위해 Google 재로그인이 필요합니다.
        </div>
      </div>
      <button
        onClick={handleRelogin}
        disabled={loading}
        className="btn-primary text-xs px-3 py-1.5"
      >
        {loading ? '이동 중...' : 'Google로 다시 로그인'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="닫기"
        className="text-amber-700 hover:text-amber-900 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
