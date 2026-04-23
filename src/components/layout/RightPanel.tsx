'use client'

import { usePanelStore } from '@/store/panelStore'

export default function RightPanel() {
  const { isOpen, openPanel } = usePanelStore()

  return (
    <>
      {/* Collapsed tab — always visible on right edge */}
      {!isOpen && (
        <button
          onClick={() => openPanel('kakao-copy')}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30
                     bg-yellow-400 hover:bg-yellow-500 text-gray-900
                     rounded-l-toss shadow-toss-md transition-colors
                     flex flex-col items-center justify-center gap-1
                     px-2 py-4"
          title="카카오 문자 발송 패널"
          style={{ width: 'var(--right-panel-collapsed-width)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.8 1.64 5.28 4.14 6.84L5 21l4.14-2.18C10.03 19.26 11 19.5 12 19.5c5.52 0 10-3.69 10-8.25S17.52 3 12 3z" />
          </svg>
          <span className="text-xs font-bold [writing-mode:vertical-rl]">카톡</span>
        </button>
      )}

      {/* Panel body */}
      {isOpen && <PanelBody />}
    </>
  )
}

function PanelBody() {
  const { closePanel, mode } = usePanelStore()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={closePanel}
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-40 bg-white shadow-toss-lg
                   flex flex-col animate-slide-in-right"
        style={{
          width: 'var(--right-panel-width)',
          paddingTop: 'var(--header-height)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            {mode === 'kakao-copy' ? '카카오 문자 발송' : '보험 설계'}
          </h2>
          <button
            onClick={closePanel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'kakao-copy' && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">고객을 선택하면</p>
              <p className="text-sm">카카오 메시지를 구성합니다</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
