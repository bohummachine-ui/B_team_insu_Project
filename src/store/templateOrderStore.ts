// 템플릿 카드 순서를 localStorage에 퍼시스트
// 양쪽 패널(TemplatePanel, TemplatesTab)에서 동일 순서 적용
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TemplateOrderState {
  orderedIds: string[]
  setOrder: (ids: string[]) => void
}

export const useTemplateOrderStore = create<TemplateOrderState>()(
  persist(
    (set) => ({
      orderedIds: [],
      setOrder: (ids) => set({ orderedIds: ids }),
    }),
    { name: 'template-order' }
  )
)
