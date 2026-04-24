// Design Ref: §5.4 글로벌 우측 슬라이드 패널 — 템플릿/이미지 탭 + 단축키 `]`
import { create } from 'zustand'

export type PanelMode = 'templates' | 'images' | 'kakao-copy' | 'insurance' | null

// 템플릿 변수 치환에 사용할 고객 정보
export interface CustomerVars {
  name: string
  age: number | null
  job: string | null
  jobDetail: string | null
  gender: string | null
  phone: string | null
}

interface PanelState {
  isOpen: boolean
  mode: PanelMode
  targetCustomerId: string | undefined
  targetCustomerName: string | undefined
  targetCustomerVars: CustomerVars | undefined
  openPanel: (mode: PanelMode, opts?: { customerId?: string; customerName?: string; customerVars?: CustomerVars }) => void
  closePanel: () => void
  togglePanel: () => void
  setMode: (mode: PanelMode) => void
  /** 고객 상세 페이지 진입 시 호출 — 패널 열림 여부와 무관하게 고객 정보 세팅 */
  setCustomerContext: (vars: CustomerVars, customerId?: string) => void
  clearCustomerContext: () => void
}

export const usePanelStore = create<PanelState>((set, get) => ({
  isOpen: false,
  mode: null,
  targetCustomerId: undefined,
  targetCustomerName: undefined,
  targetCustomerVars: undefined,
  openPanel: (mode, opts) =>
    set({
      isOpen: true,
      mode,
      targetCustomerId: opts?.customerId,
      targetCustomerName: opts?.customerName,
      targetCustomerVars: opts?.customerVars,
    }),
  closePanel: () =>
    set({ isOpen: false, mode: null, targetCustomerId: undefined, targetCustomerName: undefined, targetCustomerVars: undefined }),
  togglePanel: () => {
    const { isOpen, mode } = get()
    if (isOpen) {
      set({ isOpen: false, mode: null, targetCustomerId: undefined, targetCustomerName: undefined, targetCustomerVars: undefined })
    } else {
      set({ isOpen: true, mode: mode ?? 'templates' })
    }
  },
  setMode: (mode) => set({ mode }),
  setCustomerContext: (vars, customerId) =>
    set({ targetCustomerVars: vars, targetCustomerName: vars.name, targetCustomerId: customerId }),
  clearCustomerContext: () =>
    set({ targetCustomerVars: undefined, targetCustomerName: undefined, targetCustomerId: undefined }),
}))
