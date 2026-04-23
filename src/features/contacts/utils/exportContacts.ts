// Design Ref: §5.4 주소록 — CSV/VCF export (팀 내부 공유용 v1.0)
import type { Contact } from '@/types'

function csvEscape(v: string | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function vcfEscape(v: string | null | undefined): string {
  if (v == null) return ''
  return String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export function contactsToCsv(contacts: Contact[]): string {
  const headers = ['이름', '전화', '이메일', '생년월일', '주소', '직업', '상세직업', '다음연락일', '공개여부', '메모']
  const rows = contacts.map((c) => [
    c.name, c.phone, c.email, c.birthday, c.address, c.job, c.job_detail,
    c.next_contact_date, c.is_shared ? '공개' : '비공개', c.memo,
  ].map(csvEscape).join(','))
  // UTF-8 BOM for Excel 한글 호환
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
}

export function contactsToVcf(contacts: Contact[]): string {
  return contacts.map((c) => {
    const parts = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcfEscape(c.name)}`,
      c.phone ? `TEL;TYPE=CELL:${vcfEscape(c.phone)}` : '',
      c.email ? `EMAIL:${vcfEscape(c.email)}` : '',
      c.birthday ? `BDAY:${c.birthday}` : '',
      c.address ? `ADR;TYPE=HOME:;;${vcfEscape(c.address)};;;;` : '',
      c.job ? `TITLE:${vcfEscape(c.job)}` : '',
      c.memo ? `NOTE:${vcfEscape(c.memo)}` : '',
      'END:VCARD',
    ].filter(Boolean)
    return parts.join('\r\n')
  }).join('\r\n')
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportContactsAsCsv(contacts: Contact[]) {
  const ts = new Date().toISOString().slice(0, 10)
  downloadBlob(`contacts-${ts}.csv`, contactsToCsv(contacts), 'text/csv')
}

export function exportContactsAsVcf(contacts: Contact[]) {
  const ts = new Date().toISOString().slice(0, 10)
  downloadBlob(`contacts-${ts}.vcf`, contactsToVcf(contacts), 'text/vcard')
}
