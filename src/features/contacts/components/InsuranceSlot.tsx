'use client'

// Design Ref: §3.3 — 보험 모듈 임베드 슬롯 (벤이 별도 개발 후 연결)

interface Props {
  customerId: string
  userRole: 'member' | 'admin'
  mode: 'current' | 'remodeling'
  readOnly?: boolean
}

export default function InsuranceSlot({ customerId, userRole, mode, readOnly }: Props) {
  // TODO(module-7 or external): 실제 보험 모듈 컴포넌트 임베드
  // const InsuranceModule = dynamic(() => import('@insurance-module'), { ssr: false })

  return (
    <div className="card border-2 border-dashed border-gray-200 bg-gray-50">
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 mb-1">
          {mode === 'current' ? '현재 보험' : '리모델링 플랜'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          보험 설계 모듈이 연결될 영역입니다
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-gray-400 bg-white rounded-toss px-3 py-2">
          <span>Customer ID:</span>
          <code className="font-mono">{customerId.slice(0, 8)}...</code>
          <span className="text-gray-300">|</span>
          <span>{userRole}</span>
          {readOnly && <span className="text-red-400">(읽기전용)</span>}
        </div>
      </div>
    </div>
  )
}
