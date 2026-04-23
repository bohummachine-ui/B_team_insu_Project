// Design Ref: §5.4 — 글로벌 우측 슬라이드 패널 (템플릿/이미지 탭 + 단축키 `])`
'use client'

import { usePanelStore, type PanelMode } from '@/store/panelStore'
import TemplatesTab from '@/features/panel/components/TemplatesTab'
import ImagesTab from '@/features/panel/components/ImagesTab'

export default function RightPanel() {
  const { isOpen, openPanel } = usePanelStore()

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => openPanel('templates')}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30
                     bg-yellow-400 hover:bg-yellow-500 text-gray-900
                     rounded-l-toss shadow-toss-md transition-colors
                     flex flex-col items-center justify-center gap-1
                     px-2 py-4"
          title="우측 패널 열기 (단축키: ])"
          style={{ width: 'var(--right-panel-collapsed-width)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span className="text-[10px] font-bold [writing-mode:vertical-rl]">자료</span>
        </button>
      )}

      {isOpen && <PanelBody />}
    </>
  )
}

const TABS: { value: Exclude<PanelMode, null>; label: string }[] = [
  { value: 'templates', label: '메시지 템플릿' },
  { value: 'images', label: '이미지 자료' },
]

function PanelBody() {
  const { closePanel, mode, setMode } = usePanelStore()
  const current = mode === 'templates' || mode === 'images' ? mode : 'templates'

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={closePanel} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-40 bg-white shadow-toss-lg flex flex-col animate-slide-in-right"
        style={{ width: 'var(--right-panel-width)', paddingTop: 'var(--header-height)' }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setMode(t.value)}
                className={`px-3 py-1.5 rounded-toss text-sm font-semibold transition-colors
                  ${current === t.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={closePanel}
            title="닫기 (])"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {current === 'templates' && <TemplatesTab />}
          {current === 'images' && <ImagesTab />}
        </div>
      </aside>
    </>
  )
}
