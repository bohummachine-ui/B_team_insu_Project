// Design Ref: §5.4 글로벌 우측 슬라이드 패널 — 템플릿/이미지 탭 + 단축키 `]`
import { create } from 'zustand'

export type PanelMode = 'templates' | 'images' | 'kakao-copy' | 'insurance' | null

interface PanelState {
  isOpen: boolean
  mode: PanelMode
  targetCustomerId: string | undefined
  targetCustomerName: string | undefined
  openPanel: (mode: PanelMode, opts?: { customerId?: string; customerName?: string }) => void
  closePanel: () => void
  togglePanel: () => void
  setMode: (mode: PanelMode) => void
}

export const usePanelStore = create<PanelState>((set, get) => ({
  isOpen: false,
  mode: null,
  targetCustomerId: undefined,
  targetCustomerName: undefined,
  openPanel: (mode, opts) =>
    set({
      isOpen: true,
      mode,
      targetCustomerId: opts?.customerId,
      targetCustomerName: opts?.customerName,
    }),
  closePanel: () =>
    set({ isOpen: false, mode: null, targetCustomerId: undefined, targetCustomerName: undefined }),
  togglePanel: () => {
    const { isOpen, mode } = get()
    if (isOpen) {
      set({ isOpen: false, mode: null, targetCustomerId: undefined, targetCustomerName: undefined })
    } else {
      set({ isOpen: true, mode: mode ?? 'templates' })
    }
  },
  setMode: (mode) => set({ mode }),
}))
