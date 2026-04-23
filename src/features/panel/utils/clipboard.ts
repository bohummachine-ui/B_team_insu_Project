// Design Ref: §5.4, §6.1 — 클립보드 복사 (Safari 감지 포함)

export function substituteVars(body: string, customerName: string | undefined): string {
  if (!customerName) return body
  return body.replace(/\{고객명\}/g, customerName).replace(/\{name\}/gi, customerName)
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
