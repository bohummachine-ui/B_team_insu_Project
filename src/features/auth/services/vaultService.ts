// Design Ref: §11.1 — 클라이언트용 Gemini API 키 관리 서비스
// Plan SC-2: 평문 키는 서버에만 존재. 클라이언트는 API 라우트 경유.

export type GeminiKeyStatus = { hasKey: boolean }

export const vaultService = {
  async setGeminiKey(key: string): Promise<void> {
    const res = await fetch('/api/profile/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'unknown' }))
      throw new Error(error || `failed_${res.status}`)
    }
  },

  async deleteGeminiKey(): Promise<void> {
    const res = await fetch('/api/profile/gemini-key', { method: 'DELETE' })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'unknown' }))
      throw new Error(error || `failed_${res.status}`)
    }
  },

  async getGeminiKeyStatus(): Promise<GeminiKeyStatus> {
    const res = await fetch('/api/profile/gemini-key/status', { cache: 'no-store' })
    if (!res.ok) throw new Error(`status_failed_${res.status}`)
    return res.json()
  },
}
