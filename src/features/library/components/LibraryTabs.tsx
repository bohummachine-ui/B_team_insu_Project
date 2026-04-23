'use client'

import type { LibraryTab } from '@/types'

interface TabDef {
  key: LibraryTab
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { key: 'scripts', label: '스크립트', icon: '📝' },
  { key: 'templates', label: '메시지', icon: '💬' },
  { key: 'images', label: '이미지', icon: '🖼️' },
  { key: 'recordings', label: '녹취록', icon: '🎙️' },
  { key: 'cases', label: '사례', icon: '📚' },
  { key: 'memos', label: '메모', icon: '📋' },
]

interface Props {
  current: LibraryTab
  onChange: (tab: LibraryTab) => void
}

export default function LibraryTabs({ current, onChange }: Props) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <div className="flex min-w-max">
        {TABS.map((t) => {
          const active = current === t.key
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
