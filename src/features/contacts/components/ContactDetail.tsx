'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ContactWithLabels } from '@/types'
import { calcAge } from '../utils/maskContact'
import { useDeleteContact } from '../hooks/useContact'
import ShareToggle from './ShareToggle'
import InsuranceSlot from './InsuranceSlot'
import ContactPdfButton from './ContactPdfButton'
import MaskingPreview from './MaskingPreview'
import { usePanelStore } from '@/store/panelStore'

type Tab = 'current' | 'remodeling' | 'memo' | 'history' | 'files'

interface Props {
  contact: ContactWithLabels
  userRole: 'member' | 'admin'
}

export default function ContactDetail({ contact, userRole }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('current')
  const [showMaskPreview, setShowMaskPreview] = useState(false)
  const del = useDeleteContact()
  const openPanel = usePanelStore((s) => s.openPanel)
  const setCustomerContext = usePanelStore((s) => s.setCustomerContext)
  const clearCustomerContext = usePanelStore((s) => s.clearCustomerContext)

  const age = calcAge(contact.birthday)

  // 고객 상세 페이지 진입 즉시 store에 고객 정보 세팅
  // → ] 키나 노란 버튼으로 열어도 변수 치환이 동작함
  useEffect(() => {
    setCustomerContext(
      {
        name: contact.name,
        age: calcAge(contact.birthday),
        job: contact.job ?? null,
        jobDetail: contact.job_detail ?? null,
        gender: contact.gender ?? null,
        phone: contact.phone ?? null,
      },
      contact.id
    )
    return () => {
      clearCustomerContext()
    }
  }, [contact.id, setCustomerContext, clearCustomerContext])

  const handleDelete = async () => {
    if (!confirm(`${contact.name}님을 삭제할까요? 되돌릴 수 없습니다.`)) return
    await del.mutateAsync(contact.id)
    router.push('/contacts')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/contacts" className="text-gray-400 hover:text-gray-600">
            ← 주소록
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openPanel('templates', {
              customerId: contact.id,
              customerName: contact.name,
              customerVars: {
                name: contact.name,
                age: calcAge(contact.birthday),
                job: contact.job ?? null,
                jobDetail: contact.job_detail ?? null,
                gender: contact.gender ?? null,
                phone: contact.phone ?? null,
              },
            })}
            className="btn-secondary text-sm py-2 px-4"
            title="단축키 ]"
          >
            카톡 자료
          </button>
          <button
            onClick={() => setShowMaskPreview(true)}
            className="btn-secondary text-sm py-2 px-4"
            title="타팀원에게 보이는 모습"
          >
            공개 미리보기
          </button>
          <ContactPdfButton contact={contact} />
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="btn-secondary text-sm py-2 px-4"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            disabled={del.isPending}
            className="text-sm px-4 py-2 rounded-toss text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Profile card + Share toggle */}
        <div className="col-span-1 space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{contact.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{contact.name}</p>
                <p className="text-sm text-gray-500">
                  {age !== null ? `${age}세` : ''}
                  {contact.gender ? ` · ${contact.gender === 'M' ? '남' : '여'}` : ''}
                </p>
              </div>
            </div>

            <dl className="space-y-3 text-sm">
              <Field label="전화번호" value={contact.phone} />
              <Field label="통신사" value={contact.carrier} />
              <Field label="이메일" value={contact.email} />
              <Field label="생일" value={contact.birthday ? new Date(contact.birthday).toLocaleDateString('ko-KR') : null} />
              <Field label="주소" value={contact.address} />
              <Field label="직업" value={contact.job} />
              <Field label="상세 직업" value={contact.job_detail} />
              <Field label="가족 관계" value={contact.family_info} />
              <Field
                label="다음 연락일"
                value={contact.next_contact_date ? new Date(contact.next_contact_date).toLocaleDateString('ko-KR') : null}
              />
            </dl>

            {contact.labels.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">라벨</p>
                <div className="flex flex-wrap gap-1">
                  {contact.labels.map((label) => (
                    <span
                      key={label.id}
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: `${label.color}20`, color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ShareToggle contact={contact} />
        </div>

        {/* Right: Tabs */}
        <div className="col-span-2">
          <div className="flex border-b border-gray-100 mb-4">
            {[
              { key: 'current', label: '현재 보험' },
              { key: 'remodeling', label: '리모델링 플랜' },
              { key: 'memo', label: '상담 메모' },
              { key: 'history', label: '히스토리' },
              { key: 'files', label: '파일·증권' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as Tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'current' && (
            <InsuranceSlot customerId={contact.id} userRole={userRole} mode="current" />
          )}
          {tab === 'remodeling' && (
            <InsuranceSlot customerId={contact.id} userRole={userRole} mode="remodeling" />
          )}
          {tab === 'memo' && (
            <div className="card">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {contact.memo || <span className="text-gray-400">등록된 상담 메모가 없습니다</span>}
              </p>
            </div>
          )}
          {tab === 'history' && (
            <div className="card">
              <p className="text-sm text-gray-700 font-medium mb-2">히스토리 (v1.1 예정)</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                고객 정보 변경 이력과 상담 기록 타임라인은 다음 버전(v1.1)에서 제공됩니다.<br />
                현재는 <strong>상담 메모</strong> 탭에서 기록을 관리해주세요.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                · 수정 이력은 Supabase audit log에서 조회 가능합니다 (팀장 한정).
              </div>
            </div>
          )}
          {tab === 'files' && (
            <div className="card">
              <p className="text-sm text-gray-700 font-medium mb-2">파일·증권 (v1.1 예정)</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Google Drive 연동으로 녹음본/증권/약관 업로드는 v1.1에서 제공됩니다.<br />
                현재는 <strong>자료실 → 녹음본</strong>에서 Drive 링크를 수동으로 연결해주세요.
              </p>
              <Link
                href="/library"
                className="inline-block mt-4 text-sm text-primary hover:underline"
              >
                자료실로 이동 →
              </Link>
            </div>
          )}
        </div>
      </div>

      {showMaskPreview && (
        <MaskingPreview contact={contact} onClose={() => setShowMaskPreview(false)} />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{value || '-'}</dd>
    </div>
  )
}
