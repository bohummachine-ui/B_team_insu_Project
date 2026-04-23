import { create } from 'zustand'

export type PanelMode = 'kakao-copy' | 'insurance' | null

interface PanelState {
  isOpen: boolean
  mode: PanelMode
  targetCustomerId: string | undefined
  openPanel: (mode: PanelMode, customerId?: string) => void
  closePanel: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  mode: null,
  targetCustomerId: undefined,
  openPanel: (mode, customerId) =>
    set({ isOpen: true, mode, targetCustomerId: customerId }),
  closePanel: () =>
    set({ isOpen: false, mode: null, targetCustomerId: undefined }),
}))
