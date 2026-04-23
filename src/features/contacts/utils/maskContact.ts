// Design Ref: §3.1 — contacts_shared_view 마스킹 규칙 클라이언트 미러
// 실제 보안은 DB 뷰(RLS)로 강제되며 이 유틸은 미리보기 UI용

import type { Contact, ContactSharedView } from '@/types'

export function maskPhone(phone: string): string {
  // 010-1234-5678 → 010-****-5678
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return '***-****-****'
  const last4 = digits.slice(-4)
  const prefix = digits.slice(0, 3)
  return `${prefix}-****-${last4}`
}

export function maskName(name: string): string {
  // 홍길동 → 홍*동, 김철 → 김*, 이철수 → 이*수
  if (!name) return ''
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

export function calcAge(birthday: string | null): number | null {
  if (!birthday) return null
  const birth = new Date(birthday)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function previewMaskedContact(contact: Contact): ContactSharedView {
  return {
    id: contact.id,
    owner_user_id: contact.owner_user_id,
    team_id: contact.team_id,
    name: maskName(contact.name),
    phone: maskPhone(contact.phone),
    birthday: contact.birthday,
    gender: contact.gender,
    age: calcAge(contact.birthday),
    job: contact.job,
    job_detail: contact.job_detail,
    next_contact_date: contact.next_contact_date,
    is_shared: true,
    created_at: contact.created_at,
  }
}
