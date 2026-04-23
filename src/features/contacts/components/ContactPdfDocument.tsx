// Design Ref: §5.2, §11 — 인쇄용 자료 / PDF 내보내기
'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { ContactWithLabels } from '@/types'
import { calcAge } from '../utils/maskContact'

// 한글 폰트 (Pretendard CDN)
try {
  Font.register({
    family: 'Pretendard',
    src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/web/static/PretendardVariable.ttf',
  })
} catch {
  // 폰트 재등록 에러 무시
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Pretendard', fontSize: 11, color: '#1f2937' },
  header: { marginBottom: 18, paddingBottom: 10, borderBottom: '1pt solid #e5e7eb' },
  title: { fontSize: 22, fontWeight: 700, color: '#111827' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', paddingVertical: 4, borderBottom: '0.5pt solid #f3f4f6' },
  label: { width: 90, color: '#6b7280', fontSize: 10 },
  value: { flex: 1, color: '#1f2937' },
  memo: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
    fontSize: 10,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

function fmt(v: string | null | undefined): string {
  return v && v.trim() ? v : '-'
}

interface Props {
  contact: ContactWithLabels
  generatedAt?: string
}

export default function ContactPdfDocument({ contact, generatedAt }: Props) {
  const age = calcAge(contact.birthday)
  const genderLabel = contact.gender === 'M' ? '남' : contact.gender === 'F' ? '여' : '-'
  const ts = generatedAt ?? new Date().toLocaleString('ko-KR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{contact.name}</Text>
          <Text style={styles.subtitle}>
            {age !== null ? `${age}세` : ''} {genderLabel !== '-' ? `· ${genderLabel}` : ''}
            {contact.job ? ` · ${contact.job}` : ''}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <View style={styles.row}>
            <Text style={styles.label}>전화</Text>
            <Text style={styles.value}>{fmt(contact.phone)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>이메일</Text>
            <Text style={styles.value}>{fmt(contact.email)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>생년월일</Text>
            <Text style={styles.value}>{fmt(contact.birthday)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>주소</Text>
            <Text style={styles.value}>{fmt(contact.address)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>직업</Text>
            <Text style={styles.value}>{fmt(contact.job_detail || contact.job)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상담 참고</Text>
          <View style={styles.row}>
            <Text style={styles.label}>체중/키</Text>
            <Text style={styles.value}>
              {contact.weight ? `${contact.weight}kg` : '-'} / {contact.height ? `${contact.height}cm` : '-'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>운전</Text>
            <Text style={styles.value}>{contact.drives ? '예' : '아니오'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>흡연</Text>
            <Text style={styles.value}>{contact.smokes ? '예' : '아니오'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>가족 관계</Text>
            <Text style={styles.value}>{fmt(contact.family_info)}</Text>
          </View>
        </View>

        {contact.memo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>메모</Text>
            <Text style={styles.memo}>{contact.memo}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          백지운지점 팀 CRM · 생성: {ts} · 본 자료는 내부 상담용입니다.
        </Text>
      </Page>
    </Document>
  )
}
