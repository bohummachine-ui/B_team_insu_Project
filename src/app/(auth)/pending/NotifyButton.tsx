// Design Ref: §5.4 Pending — 팀장에게 승인 요청 알림 (v1.0 클라이언트 rate-limit, v1.1 Slack/이메일 연동)
'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pending:lastNotifyAt'
const COOLDOWN_MS = 10 * 60 * 1000 // 10분

export default function NotifyButton() {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [cooldownRemain, setCooldownRemain] = useState(0)

  useEffect(() => {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0)
    const remain = Math.max(0, COOLDOWN_MS - (Date.now() - last))
    setCooldownRemain(remain)
    if (remain > 0) {
      const t = setInterval(() => {
        const r = Math.max(0, COOLDOWN_MS - (Date.now() - last))
        setCooldownRemain(r)
        if (r === 0) clearInterval(t)
      }, 1000)
      return () => clearInterval(t)
    }
  }, [])

  const onClick = async () => {
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/pending/notify', { method: 'POST' })
      if (!res.ok) throw new Error('notify failed')
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
      setCooldownRemain(COOLDOWN_MS)
      setMessage('팀장에게 알림을 전송했습니다.')
    } catch {
      setMessage('전송 실패. 잠시 후 다시 시도해주세요.')
    } finally {
      setSending(false)
    }
  }

  const disabled = sending || cooldownRemain > 0
  const minRemain = Math.ceil(cooldownRemain / 60000)

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-toss bg-primary text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {sending
          ? '전송 중...'
          : cooldownRemain > 0
          ? `알림 재전송 (${minRemain}분 후 가능)`
          : '팀장에게 승인 요청 알림'}
      </button>
      {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
    </div>
  )
}
