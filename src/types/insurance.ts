// 보험 모듈 임베드 인터페이스 — 벤이 별도 개발 후 이 인터페이스로 연동
// Design Ref: §3.3 — InsuranceModuleProps, InsuranceModuleEvent

export interface InsuranceModuleProps {
  customerId: string
  authToken: string
  userRole: 'member' | 'admin'
  readOnly?: boolean
  onDataChange?: (event: InsuranceModuleEvent) => void
}

export type InsuranceModuleEventType = 'saved' | 'changed' | 'pdf_ready'

export interface InsuranceModuleEvent {
  type: InsuranceModuleEventType
  customerId: string
  payload?: unknown
}
