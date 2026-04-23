// Design Ref: §5.2 — 인쇄용 자료 / PDF 내보내기 버튼
'use client'

import dynamic from 'next/dynamic'
import type { ContactWithLabels } from '@/types'

// react-pdf는 SSR 비호환 — dynamic import 필수
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <span className="btn-secondary text-sm py-2 px-4 opacity-50">PDF 준비...</span> }
)
const ContactPdfDocument = dynamic(() => import('./ContactPdfDocument'), { ssr: false })

interface Props {
  contact: ContactWithLabels
}

export default function ContactPdfButton({ contact }: Props) {
  const fileName = `${contact.name}_상담자료_${new Date().toISOString().slice(0, 10)}.pdf`

  return (
    <PDFDownloadLink
      document={<ContactPdfDocument contact={contact} />}
      fileName={fileName}
      className="btn-secondary text-sm py-2 px-4"
    >
      {({ loading, error }) =>
        error ? 'PDF 오류' : loading ? 'PDF 생성 중...' : '인쇄용 자료 / PDF'
      }
    </PDFDownloadLink>
  )
}
