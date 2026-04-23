'use client'

// Design Ref: §5 /team/[userId] — 팀원 상세 (읽기 전용, 6탭)
import { useState } from 'react'
import Link from 'next/link'
import {
  useTeamMember,
  useMemberPublicContacts,
  useMemberSharedScripts,
  useMemberSharedTemplates,
  useMemberSharedImages,
  useMemberSharedRecordings,
  useMemberSharedCases,
} from '../hooks/useTeamMembers'
import { imageAssetService } from '@/features/library/services'
import { renderTemplate } from '@/features/library/utils/renderTemplate'
import { TEMPLATE_CATEGORY_LABEL } from '@/types'

type Tab = 'contacts' | 'scripts' | 'templates' | 'images' | 'recordings' | 'cases'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'contacts', label: '공개 고객' },
  { key: 'scripts', label: '스크립트' },
  { key: 'templates', label: '템플릿' },
  { key: 'images', label: '이미지' },
  { key: 'recordings', label: '녹취록' },
  { key: 'cases', label: '사례' },
]

export default function TeamMemberDetail({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('contacts')
  const { data: member, isLoading } = useTeamMember(userId)

  if (isLoading) {
    return <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
  }
  if (!member) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">존재하지 않거나 접근할 수 없는 팀원입니다</p>
        <Link href="/team" className="text-primary text-sm mt-2 inline-block">
          ← 팀원 목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/team" className="text-gray-500 hover:text-gray-900">
          ←
        </Link>
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
          {(member.name ?? '?').slice(0, 1)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{member.name ?? '이름 없음'}</h1>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {member.role === 'admin' ? '팀장' : '팀원'}
            </span>
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
              읽기 전용
            </span>
          </div>
          {member.email && (
            <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'contacts' && <ContactsTab userId={userId} />}
        {tab === 'scripts' && <ScriptsTab userId={userId} />}
        {tab === 'templates' && <TemplatesTab userId={userId} />}
        {tab === 'images' && <ImagesTab userId={userId} />}
        {tab === 'recordings' && <RecordingsTab userId={userId} />}
        {tab === 'cases' && <CasesTab userId={userId} />}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="text-gray-400 text-sm py-8 text-center">{label}이 없습니다</div>
}

function ContactsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberPublicContacts(userId)
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공개 고객" />
  return (
    <div className="space-y-2">
      {data.map((c) => (
        <div key={c.id} className="card">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{c.name}</span>
            {c.gender && (
              <span className="text-xs text-gray-500">
                {c.gender === 'M' ? '남' : '여'}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {c.phone ?? '-'}
            {c.job_detail && ` · ${c.job_detail}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScriptsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberSharedScripts(userId)
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공유 스크립트" />
  return (
    <div className="space-y-2">
      {data.map((s) => (
        <div key={s.id} className="card">
          <h3 className="font-bold text-gray-900">{s.title}</h3>
          <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap line-clamp-6">{s.body}</p>
        </div>
      ))}
    </div>
  )
}

function TemplatesTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberSharedTemplates(userId)
  const copy = async (body: string) => {
    await navigator.clipboard.writeText(renderTemplate(body))
    alert('복사되었습니다')
  }
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공유 템플릿" />
  return (
    <div className="space-y-2">
      {data.map((t) => (
        <div key={t.id} className="card">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{t.title}</h3>
                {t.category && (
                  <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded">
                    {TEMPLATE_CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 whitespace-pre-wrap line-clamp-4">{t.body}</p>
            </div>
            <button
              onClick={() => copy(t.body)}
              className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90 whitespace-nowrap"
            >
              복사
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ImagesTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberSharedImages(userId)
  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    alert('URL이 복사되었습니다')
  }
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공유 이미지" />
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {data.map((img) => {
        const url = imageAssetService.getPublicUrl(img.storage_path)
        return (
          <div key={img.id} className="card p-2">
            <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={img.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-900 truncate flex-1">{img.title}</span>
              <button
                onClick={() => copy(url)}
                className="text-xs bg-primary text-white px-2 py-0.5 rounded hover:bg-primary/90"
              >
                복사
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RecordingsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberSharedRecordings(userId)
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공유 녹취록" />
  return (
    <div className="space-y-2">
      {data.map((r) => (
        <div key={r.id} className="card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{r.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(r.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            {r.drive_share_link && (
              <a
                href={r.drive_share_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
              >
                재생
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function CasesTab({ userId }: { userId: string }) {
  const { data, isLoading } = useMemberSharedCases(userId)
  if (isLoading) return <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
  if (!data || data.length === 0) return <Empty label="공유 사례" />
  return (
    <div className="space-y-2">
      {data.map((c) => (
        <div key={c.id} className="card">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{c.title}</h3>
            {c.outcome && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  c.outcome === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {c.outcome === 'success' ? '성공' : '실패'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 whitespace-pre-wrap line-clamp-4">{c.body}</p>
        </div>
      ))}
    </div>
  )
}
