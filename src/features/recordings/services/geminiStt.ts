// Design Ref: §6.1 — Gemini STT 도메인 서비스 (서버 전용)
// Plan SC-1: Gemini 2.5 Flash Lite 모델로 한국어 보험 상담 녹취 자동 STT
import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_STT_MODEL = 'gemini-2.5-flash-lite'
export const MAX_STT_BYTES = 20 * 1024 * 1024 // 20MB

const STT_PROMPT = `이 오디오는 한국어 보험 상담 녹음입니다.
1. 한국어로 정확히 받아쓰기 하세요.
2. 화자가 구분되면 "담당자:", "고객:" 으로 표시하세요.
3. 음성 배경잡음/헛기침은 생략합니다.
4. 보험 전문용어(예: 갱신형, 무해지환급형, 보장개시일)는 정확히 표기하세요.
5. 결과만 출력하세요. 설명 문구 금지.`

export type SttErrorCode =
  | 'file_too_large'
  | 'rate_limited'
  | 'invalid_audio'
  | 'invalid_key'
  | 'empty_result'
  | 'stt_failed'

export class SttError extends Error {
  constructor(public code: SttErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'SttError'
  }
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  apiKey: string,
  mimeType: string
): Promise<string> {
  // Plan SC-3: 20MB 초과 파일은 STT 실행 금지
  if (audioBuffer.byteLength > MAX_STT_BYTES) {
    throw new SttError('file_too_large')
  }

  const normalizedMime = normalizeAudioMimeType(mimeType)
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_STT_MODEL })

  try {
    const result = await model.generateContent([
      { inlineData: { data: audioBuffer.toString('base64'), mimeType: normalizedMime } },
      { text: STT_PROMPT },
    ])
    const text = result.response.text().trim()
    if (!text) throw new SttError('empty_result')
    return text
  } catch (err: unknown) {
    if (err instanceof SttError) throw err
    throw mapGeminiError(err)
  }
}

function normalizeAudioMimeType(mimeType: string): string {
  // Gemini는 일부 오디오 MIME 타입만 인식. application/octet-stream 등 일반형은 보정.
  const lower = (mimeType || '').toLowerCase()
  if (lower.startsWith('audio/')) return lower
  // 확장자 추정이 불가하므로 안전한 기본값
  return 'audio/mpeg'
}

function mapGeminiError(err: unknown): SttError {
  const status = getErrorStatus(err)
  const message = (err as { message?: string })?.message ?? 'stt_failed'

  if (status === 429) return new SttError('rate_limited', message)
  if (status === 400) return new SttError('invalid_audio', message)
  if (status === 401 || status === 403) return new SttError('invalid_key', message)

  // 메시지 기반 보조 판정 (SDK가 status를 안 노출할 때)
  if (/rate|quota|limit/i.test(message)) return new SttError('rate_limited', message)
  if (/api key|unauthoriz|permission/i.test(message)) return new SttError('invalid_key', message)
  if (/invalid|unsupported.*audio/i.test(message)) return new SttError('invalid_audio', message)

  return new SttError('stt_failed', message)
}

function getErrorStatus(err: unknown): number {
  const e = err as {
    status?: number
    code?: number
    response?: { status?: number }
    cause?: { status?: number }
  }
  return e?.status ?? e?.code ?? e?.response?.status ?? e?.cause?.status ?? 0
}
