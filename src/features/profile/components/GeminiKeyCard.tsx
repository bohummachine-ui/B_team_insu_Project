// Design Ref: §5.1 — 프로필 Gemini API 키 등록 섹션
// Plan SC-2: 평문 키는 저장 후 즉시 state에서 제거, 응답 바디에 포함되지 않음
'use client'

import { useState } from 'react'
import {
  useDeleteGeminiKey,
  useGeminiKeyStatus,
  useSetGeminiKey,
} from '@/features/auth/hooks/useGeminiKey'

const GEMINI_KEYS_URL = 'https://aistudio.google.com/apikey'

export default function GeminiKeyCard() {
  const { data: status, isLoading } = useGeminiKeyStatus()
  const setKey = useSetGeminiKey()
  const deleteKey = useDeleteGeminiKey()

  const [input, setInput] = useState('')
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const hasKey = !!status?.hasKey
  const busy = setKey.isPending || deleteKey.isPending

  const handleSave = async () => {
    const trimmed = input.trim()
    if (trimmed.length < 20) {
      setMessage({ text: 'API 키는 20자 이상이어야 합니다', isError: true })
      return
    }
    setMessage(null)
    try {
      await setKey.mutateAsync(trimmed)
      setInput('')
      setMessage({ text: '✅ API 키가 암호화되어 저장되었습니다', isError: false })
    } catch (err) {
      const msg = (err as Error)?.message ?? '저장 실패'
      setMessage({ text: `저장 실패: ${msg}`, isError: true })
    }
  }

  const handleDelete = async () => {
    if (!confirm('등록된 Gemini API 키를 삭제할까요? 이후 업로드 녹취록은 자동 STT되지 않습니다.')) return
    setMessage(null)
    try {
      await deleteKey.mutateAsync()
      setMessage({ text: 'API 키가 삭제되었습니다', isError: false })
    } catch (err) {
      const msg = (err as Error)?.message ?? '삭제 실패'
      setMessage({ text: `삭제 실패: ${msg}`, isError: true })
    }
  }

  return (
    <section className="bg-white rounded-toss border border-gray-100 p-6 mb-4">
      <h2 className="font-semibold text-gray-900 mb-1">
        🔑 Gemini API 키 <span className="text-xs font-normal text-gray-500">(녹취록 자동 STT용)</span>
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        본인의 무료 Gemini API 키를 등록하면, 업로드한 녹취록이 자동으로 텍스트로 변환됩니다.
        키는 Supabase Vault로 암호화되어 저장되며, 평문으로는 어디에서도 조회되지 않습니다.
      </p>

      <div className="mb-3 text-sm">
        <span className="text-gray-500">상태: </span>
        {isLoading ? (
          <span className="text-gray-400">확인 중...</span>
        ) : hasKey ? (
          <span className="text-green-600 font-semibold">✅ 등록됨</span>
        ) : (
          <span className="text-gray-500">❌ 미등록</span>
        )}
      </div>

      <a
        href={GEMINI_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-primary hover:underline mb-3"
      >
        🔗 무료 API 키 발급받기 (Google AI Studio)
      </a>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          autoComplete="off"
          placeholder="AIza..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className="input flex-1"
          data-testid="gemini-key-input"
        />
        <button
          onClick={handleSave}
          disabled={busy || !input.trim()}
          className="btn-primary whitespace-nowrap"
          data-testid="gemini-key-save"
        >
          {setKey.isPending ? '저장 중...' : hasKey ? '교체' : '저장'}
        </button>
        {hasKey && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="btn-secondary whitespace-nowrap text-red-500"
            data-testid="gemini-key-delete"
          >
            {deleteKey.isPending ? '삭제 중...' : '삭제'}
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mt-3 text-sm ${message.isError ? 'text-red-600' : 'text-green-700'}`}
          role="status"
        >
          {message.text}
        </div>
      )}
    </section>
  )
}
