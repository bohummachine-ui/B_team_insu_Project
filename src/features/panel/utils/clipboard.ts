// Design Ref: §5.4, §6.1 — 클립보드 복사 (Safari 감지 포함)
import type { CustomerVars } from '@/store/panelStore'

// 지원 변수 목록:
// {고객}, {고객명}, {이름}, {성함}, {name} → 이름
// {나이}                                   → 나이 (ex: 45)
// {직업}                                   → 직업
// {상세직업}, {직업상세}                    → 상세 직업
// {성별}                                   → 남 / 여
// {전화}, {전화번호}                        → 전화번호
export function substituteVars(body: string, vars: CustomerVars | string | undefined): string {
  // 하위 호환: string으로 호출되면 이름만 치환
  if (!vars) return body
  const v: CustomerVars = typeof vars === 'string'
    ? { name: vars, age: null, job: null, jobDetail: null, gender: null, phone: null }
    : vars

  const genderLabel = v.gender === 'M' ? '남' : v.gender === 'F' ? '여' : ''

  return body
    .replace(/\{고객\}/g, v.name)
    .replace(/\{고객명\}/g, v.name)
    .replace(/\{이름\}/g, v.name)
    .replace(/\{성함\}/g, v.name)
    .replace(/\{name\}/gi, v.name)
    .replace(/\{나이\}/g, v.age !== null ? String(v.age) : '')
    .replace(/\{직업\}/g, v.job ?? '')
    .replace(/\{상세직업\}/g, v.jobDetail ?? v.job ?? '')
    .replace(/\{직업상세\}/g, v.jobDetail ?? v.job ?? '')
    .replace(/\{성별\}/g, genderLabel)
    .replace(/\{전화\}/g, v.phone ?? '')
    .replace(/\{전화번호\}/g, v.phone ?? '')
}

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard) throw new Error('클립보드 접근 권한이 필요합니다. 브라우저 설정에서 허용해주세요.')
  await navigator.clipboard.writeText(text)
}

export async function copyImageFromUrl(url: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('이 기능은 Chrome, Edge, Whale 브라우저에서 지원됩니다.')
  }
  const res = await fetch(url, { mode: 'cors' })
  const blob = await res.blob()
  // Safari/일부 브라우저가 image/jpeg 대신 image/png만 지원할 수 있어 PNG로 변환
  const pngBlob = await convertToPng(blob)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
}

async function convertToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob
  const img = await blobToImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.')
  ctx.drawImage(img, 0, 0)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))), 'image/png')
  })
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = URL.createObjectURL(blob)
  })
}
