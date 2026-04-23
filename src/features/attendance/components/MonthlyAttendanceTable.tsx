'use client'

// Design Ref: §5.7 월간 출석표 — 80행 가상 스크롤 + sticky 이름 + 역할 그룹 헤더 + 셀 컬러
import { useMemo } from 'react'
import { List, type RowComponentProps } from 'react-window'
import { ATTENDANCE_STATUS_COLOR, ATTENDANCE_STATUS_LABEL } from '@/types/attendance'
import type { AttendanceLog, AttendanceStatus, TeamMember } from '@/types'

interface RowEntry {
  kind: 'header' | 'member'
  label?: string
  member?: TeamMember
}

interface RowProps {
  entries: RowEntry[]
  year: number
  month: number
  daysInMonth: number
  logMap: Map<string, AttendanceLog>
}

const CELL_W = 48
const NAME_COL_W = 140

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Row({ index, style, entries, year, month, daysInMonth, logMap }: RowComponentProps<RowProps>) {
  const e = entries[index]
  if (!e) return null

  if (e.kind === 'header') {
    return (
      <div
        style={style}
        className="sticky-col-container flex items-center bg-gray-100 font-bold text-sm text-gray-700 border-b border-gray-200"
      >
        <div
          className="sticky left-0 bg-gray-100 px-3 py-2 z-10 border-r border-gray-200"
          style={{ width: NAME_COL_W, minWidth: NAME_COL_W }}
        >
          {e.label}
        </div>
      </div>
    )
  }

  const m = e.member!
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      style={style}
      className="flex items-center border-b border-gray-100 hover:bg-gray-50"
    >
      <div
        className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-2 z-10 border-r border-gray-200 text-sm font-medium text-gray-900 truncate"
        style={{ width: NAME_COL_W, minWidth: NAME_COL_W }}
      >
        {m.name ?? '이름 없음'}
      </div>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const log = logMap.get(`${m.id}:${dateStr}`)
        return (
          <div
            key={d}
            className="flex items-center justify-center border-r border-gray-100 py-2 text-[10px]"
            style={{ width: CELL_W, minWidth: CELL_W }}
            title={
              log
                ? `${ATTENDANCE_STATUS_LABEL[log.status as AttendanceStatus]} · ${formatTime(log.first_logged_at)}`
                : ''
            }
          >
            {log ? (
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={`w-3 h-3 rounded-full ${ATTENDANCE_STATUS_COLOR[log.status as AttendanceStatus]}`}
                />
                <span className="text-gray-500 leading-none">{formatTime(log.first_logged_at)}</span>
              </div>
            ) : (
              <span className="text-gray-200">·</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MonthlyAttendanceTable({
  members,
  logs,
  year,
  month,
  height = 520,
}: {
  members: TeamMember[]
  logs: AttendanceLog[]
  year: number
  month: number
  height?: number
}) {
  const daysInMonth = new Date(year, month, 0).getDate()

  const { entries, logMap } = useMemo(() => {
    const admins = members.filter((m) => m.role === 'admin').sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    const regulars = members.filter((m) => m.role !== 'admin').sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    const list: RowEntry[] = []
    if (admins.length > 0) {
      list.push({ kind: 'header', label: `팀장 (${admins.length})` })
      for (const m of admins) list.push({ kind: 'member', member: m })
    }
    if (regulars.length > 0) {
      list.push({ kind: 'header', label: `팀원 (${regulars.length})` })
      for (const m of regulars) list.push({ kind: 'member', member: m })
    }
    const lm = new Map<string, AttendanceLog>()
    for (const l of logs) lm.set(`${l.user_id}:${l.date}`, l)
    return { entries: list, logMap: lm }
  }, [members, logs])

  const totalWidth = NAME_COL_W + daysInMonth * CELL_W

  return (
    <div className="card overflow-auto">
      <div style={{ width: totalWidth }}>
        {/* 날짜 헤더 */}
        <div className="flex items-center border-b-2 border-gray-200 sticky top-0 bg-white z-20">
          <div
            className="sticky left-0 bg-white px-3 py-2 z-20 border-r border-gray-200 text-xs font-bold text-gray-700"
            style={{ width: NAME_COL_W, minWidth: NAME_COL_W }}
          >
            {year}년 {month}월
          </div>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(year, month - 1, i + 1)
            const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-center border-r border-gray-100 py-1 text-[10px] ${
                  isWeekend ? 'text-red-500' : 'text-gray-600'
                }`}
                style={{ width: CELL_W, minWidth: CELL_W }}
              >
                <span className="font-bold">{i + 1}</span>
                <span>{dow}</span>
              </div>
            )
          })}
        </div>

        <List
          rowComponent={Row}
          rowCount={entries.length}
          rowHeight={(index, p) => (p.entries[index]?.kind === 'header' ? 32 : 48)}
          rowProps={{ entries, year, month, daysInMonth, logMap }}
          style={{ height, width: totalWidth }}
          overscanCount={4}
        />
      </div>
    </div>
  )
}
