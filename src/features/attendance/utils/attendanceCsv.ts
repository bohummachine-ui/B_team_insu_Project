// Design Ref: §5.7 CSV 내보내기 (팀장 전용)
import type { AttendanceLog, AttendanceStatus } from '@/types'
import { ATTENDANCE_STATUS_LABEL } from '@/types/attendance'

export function buildMonthlyCsv(
  logs: AttendanceLog[],
  members: Array<{ id: string; name: string | null; role: string }>,
  year: number,
  month: number
): string {
  const daysInMonth = new Date(year, month, 0).getDate()
  const header = ['이름', '역할', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}일`)]

  const logMap = new Map<string, AttendanceLog>()
  for (const l of logs) logMap.set(`${l.user_id}:${l.date}`, l)

  const pad = (n: number) => String(n).padStart(2, '0')
  const rows = members.map((m) => {
    const cols = [m.name ?? '', m.role === 'admin' ? '팀장' : '팀원']
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month)}-${pad(d)}`
      const log = logMap.get(`${m.id}:${dateStr}`)
      cols.push(log ? ATTENDANCE_STATUS_LABEL[log.status as AttendanceStatus] : '')
    }
    return cols
  })

  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const bom = '\uFEFF'
  return (
    bom +
    [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  )
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
