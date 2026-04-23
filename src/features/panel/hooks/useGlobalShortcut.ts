// Design Ref: §5.4 — 전역 단축키: `]` 우측 패널 토글
'use client'

import { useEffect } from 'react'
import { usePanelStore } from '@/store/panelStore'

export function useGlobalShortcut() {
  const togglePanel = usePanelStore((s) => s.togglePanel)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== ']') return
      const target = e.target as HTMLElement | null
      if (!target) return
      // input/textarea/contentEditable 안에서는 무시
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      togglePanel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])
}
