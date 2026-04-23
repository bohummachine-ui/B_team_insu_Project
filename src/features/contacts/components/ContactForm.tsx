'use client'

// Design Ref: §3.2 — 고객 추가/수정 폼
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Contact, ContactInsert, ContactUpdate } from '@/types'
import { useCreateContact, useUpdateContact } from '../hooks/useContact'

interface Props {
  mode: 'create' | 'edit'
  contact?: Contact
}

type FormState = {
  name: string
  phone: string
  carrier: string
  birthday: string
  gender: '' | 'M' | 'F'
  email: string
  address: string
  job: string
  job_detail: string
  weight: string
  height: string
  drives: boolean
  smokes: boolean
  family_info: string
  memo: string
  next_contact_date: string
  is_shared: boolean
}

function toForm(c?: Contact): FormState {
  return {
    name: c?.name ?? '',
    phone: c?.phone ?? '',
    carrier: c?.carrier ?? '',
    birthday: c?.birthday ?? '',
    gender: (c?.gender as 'M' | 'F' | null) ?? '',
    email: c?.email ?? '',
    address: c?.address ?? '',
    job: c?.job ?? '',
    job_detail: c?.job_detail ?? '',
    weight: c?.weight != null ? String(c.weight) : '',
    height: c?.height != null ? String(c.height) : '',
    drives: c?.drives ?? false,
    smokes: c?.smokes ?? false,
    family_info: c?.family_info ?? '',
    memo: c?.memo ?? '',
    next_contact_date: c?.next_contact_date ?? '',
    is_shared: c?.is_shared ?? false,
  }
}

export default function ContactForm({ mode, contact }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(toForm(contact))
  const [error, setError] = useState<string | null>(null)

  const create = useCreateContact()
  const update = useUpdateContact()
  const busy = create.isPending || update.isPending

  const update1 = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.phone.trim()) {
      setError('이름과 전화번호는 필수입니다')
      return
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      carrier: form.carrier || null,
      birthday: form.birthday || null,
      gender: form.gender || null,
      email: form.email || null,
      address: form.address || null,
      job: form.job || null,
      job_detail: form.job_detail || null,
      job_code: null,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      drives: form.drives,
      smokes: form.smokes,
      family_info: form.family_info || null,
      memo: form.memo || null,
      next_contact_date: form.next_contact_date || null,
      is_shared: form.is_shared,
      shared_at: form.is_shared ? new Date().toISOString() : null,
    }

    try {
      if (mode === 'create') {
        const insertInput = payload as Omit<ContactInsert, 'owner_user_id' | 'team_id'>
        const created = await create.mutateAsync(insertInput)
        router.push(`/contacts/${created.id}`)
      } else if (contact) {
        const patch = payload as ContactUpdate
        await update.mutateAsync({ id: contact.id, patch })
        router.push(`/contacts/${contact.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={contact ? `/contacts/${contact.id}` : '/contacts'} className="text-gray-400 hover:text-gray-600">
          ← 취소
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? '고객 추가' : `${contact?.name} 수정`}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic info */}
        <section className="card">
          <h2 className="font-bold text-gray-900 mb-4">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="이름 *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update1('name', e.target.value)}
                className="input-field"
                required
              />
            </Field>
            <Field label="전화번호 *">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update1('phone', e.target.value)}
                className="input-field"
                placeholder="010-1234-5678"
                required
              />
            </Field>
            <Field label="통신사">
              <select
                value={form.carrier}
                onChange={(e) => update1('carrier', e.target.value)}
                className="input-field"
              >
                <option value="">선택 안 함</option>
                <option value="SKT">SKT</option>
                <option value="KT">KT</option>
                <option value="LGU+">LGU+</option>
                <option value="알뜰폰">알뜰폰</option>
              </select>
            </Field>
            <Field label="이메일">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update1('email', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="생일">
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => update1('birthday', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="성별">
              <select
                value={form.gender}
                onChange={(e) => update1('gender', e.target.value as FormState['gender'])}
                className="input-field"
              >
                <option value="">선택 안 함</option>
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </Field>
            <Field label="주소" full>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update1('address', e.target.value)}
                className="input-field"
              />
            </Field>
          </div>
        </section>

        {/* Job & body */}
        <section className="card">
          <h2 className="font-bold text-gray-900 mb-4">직업 · 신체</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="직업">
              <input
                type="text"
                value={form.job}
                onChange={(e) => update1('job', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="상세 직업">
              <input
                type="text"
                value={form.job_detail}
                onChange={(e) => update1('job_detail', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="키 (cm)">
              <input
                type="number"
                value={form.height}
                onChange={(e) => update1('height', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="몸무게 (kg)">
              <input
                type="number"
                value={form.weight}
                onChange={(e) => update1('weight', e.target.value)}
                className="input-field"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.drives}
                onChange={(e) => update1('drives', e.target.checked)}
                className="rounded"
              />
              운전함
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.smokes}
                onChange={(e) => update1('smokes', e.target.checked)}
                className="rounded"
              />
              흡연함
            </label>
          </div>
        </section>

        {/* Relationship & memo */}
        <section className="card">
          <h2 className="font-bold text-gray-900 mb-4">관계 · 메모</h2>
          <div className="space-y-4">
            <Field label="가족 관계">
              <textarea
                value={form.family_info}
                onChange={(e) => update1('family_info', e.target.value)}
                className="input-field"
                rows={2}
                placeholder="배우자 이름, 자녀 수 등"
              />
            </Field>
            <Field label="상담 메모">
              <textarea
                value={form.memo}
                onChange={(e) => update1('memo', e.target.value)}
                className="input-field"
                rows={4}
              />
            </Field>
            <Field label="다음 연락일">
              <input
                type="date"
                value={form.next_contact_date}
                onChange={(e) => update1('next_contact_date', e.target.value)}
                className="input-field"
              />
            </Field>
          </div>
        </section>

        {/* Share */}
        <section className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_shared}
              onChange={(e) => update1('is_shared', e.target.checked)}
              className="mt-1 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">팀에 공개</p>
              <p className="text-sm text-gray-500 mt-1">
                공개하면 팀원들이 마스킹된 정보로 볼 수 있습니다
              </p>
            </div>
          </label>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-toss px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Link
            href={contact ? `/contacts/${contact.id}` : '/contacts'}
            className="btn-secondary"
          >
            취소
          </Link>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? '저장 중...' : mode === 'create' ? '등록' : '수정 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
