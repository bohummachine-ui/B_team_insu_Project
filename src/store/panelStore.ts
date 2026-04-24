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
    set((state) => ({
      isOpen: true,
      mode,
      // opts에 명시적으로 전달된 경우만 덮어쓰기, 없으면 기존 값 유지
      // (] 키 / 노란 버튼으로 열 때 setCustomerContext가 세팅한 값을 보존)
      targetCustomerId: opts?.customerId ?? state.targetCustomerId,
      targetCustomerName: opts?.customerName ?? state.targetCustomerName,
      targetCustomerVars: opts?.customerVars ?? state.targetCustomerVars,
    })),
  // closePanel: isOpen/mode만 초기화 — 고객 context는 유지 (고객 페이지 이탈 시 clearCustomerContext가 처리)
  closePanel: () =>
    set({ isOpen: false, mode: null }),
  togglePanel: () => {
    const { isOpen, mode } = get()
    // isOpen 토글만 — 고객 context는 건드리지 않음
    set({ isOpen: !isOpen, mode: isOpen ? null : (mode ?? 'templates') })
  },
  setMode: (mode) => set({ mode }),
  setCustomerContext: (vars, customerId) =>
    set({ targetCustomerVars: vars, targetCustomerName: vars.name, targetCustomerId: customerId }),
  clearCustomerContext: () =>
    set({ targetCustomerVars: undefined, targetCustomerName: undefined, targetCustomerId: undefined }),
}))
