// Design Ref: §5, Plan FR-12 — 이미지 2MB/20장 제한
import { IMAGE_LIMITS } from '@/types'

export interface ImageValidationResult {
  ok: boolean
  error?: string
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: '이미지 파일만 업로드 가능합니다' }
  }
  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(2)
    return { ok: false, error: `파일 크기가 너무 큽니다 (${mb}MB, 최대 2MB)` }
  }
  return { ok: true }
}

export function validateImageCount(currentCount: number): ImageValidationResult {
  if (currentCount >= IMAGE_LIMITS.MAX_PER_USER) {
    return {
      ok: false,
      error: `이미지 등록 한도를 초과했습니다 (${IMAGE_LIMITS.MAX_PER_USER}장). 기존 이미지를 삭제해주세요.`,
    }
  }
  return { ok: true }
}
