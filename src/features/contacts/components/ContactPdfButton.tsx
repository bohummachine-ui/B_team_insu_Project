// Design Ref: §5.2 — 인쇄용 자료 / PDF 내보내기 버튼
'use client'

import dynamic from 'next/dynamic'
import type { ContactWithLabels } from '@/types'

// PDFDownloadLink + ContactPdfDocument를 단일 dynamic import로 묶음
// 이유: 두 import를 별도로 dynamic 로드하면 PDFDownloadLink가 먼저 준비됐을 때
//       ContactPdfDocument가 아직 null을 반환 → react-pdf toBlob 크래시
const ContactPdfButtonInner = dynamic(
  () => import('./ContactPdfButtonInner'),
  { ssr: false, loading: () => <span className="btn-secondary text-sm py-2 px-4 opacity-50">PDF 준비...</span> }
)

interface Props {
  contact: ContactWithLabels
}

export default function ContactPdfButton({ contact }: Props) {
  return <ContactPdfButtonInner contact={contact} />
}
