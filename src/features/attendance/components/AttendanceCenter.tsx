'use client'

// Design Ref: §5.7 근태 센터 /attendance — 월간 출석표 + 개인 리포트 + 사무실 IP 관리(팀장)
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers'
import { useMonthlyTeamAttendance } from '../hooks/useMonthlyAttendance'
import { useAttendanceRealtime } from '../hooks/useAttendance'
import MonthlyAttendanceTable from './MonthlyAttendanceTable'
import PersonalAttendanceReport from './PersonalAttendanceReport'
import OfficeIpManager from './OfficeIpManager'
import { buildMonthlyCsv, downloadCsv } from '../utils/attendanceCsv'

function todayYM(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function AttendanceCenter() {
  const [{ year, month }, setYM] = useState(todayYM())
  const { isAdmin } = useAuth()

  useAttendanceRealtime()

  const { data: members } = useTeamMembers({ sortBy: 'name' })
  const memberIds = (members ?? []).map((m) => m.id)
  const { data: logs, isLoading } = useMonthlyTeamAttendance({ year, month }, memberIds)

  const prev = () => setYM(shiftMonth(year, month, -1))
  const next = () => setYM(shiftMonth(year, month, 1))
  const thisMonth = () => setYM(todayYM())

  const exportCsv = () => {
    if (!members || !logs) return
    const csv = buildMonthlyCsv(
      logs,
      members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
      year,
      month
    )
    downloadCsv(`attendance_${year}-${String(month).padStart(2, '0')}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">근태 센터</h1>
        <p className="text-sm text-gray-500 mt-1">
          팀 월간 출석표와 개인 근태 리포트를 확인합니다
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={prev} className="btn-secondary">
          ←
        </button>
        <button onClick={thisMonth} className="btn-secondary">
          이번 달
        </button>
        <button onClick={next} className="btn-secondary">
          →
        </button>
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={exportCsv}
            disabled={!logs || !members}
            className="btn-primary"
          >
            CSV 내보내기
          </button>
        )}
      </div>

      <PersonalAttendanceReport year={year} month={month} />

      {isLoading ? (
        <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
      ) : (
        <MonthlyAttendanceTable
          members={members ?? []}
          logs={logs ?? []}
          year={year}
          month={month}
        />
      )}

      {isAdmin && <OfficeIpManager />}
    </div>
  )
}
