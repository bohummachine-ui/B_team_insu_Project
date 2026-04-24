'use client'

// ContactPdfButton의 inner — PDFDownloadLink + ContactPdfDocument를 동일 모듈에서 import
// 이렇게 해야 두 라이브러리가 동시에 로드돼 react-pdf가 null 문서를 받지 않음
import { PDFDownloadLink } from '@react-pdf/renderer'
import ContactPdfDocument from './ContactPdfDocument'
import type { ContactWithLabels } from '@/types'

interface Props {
  contact: ContactWithLabels
}

export default function ContactPdfButtonInner({ contact }: Props) {
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
