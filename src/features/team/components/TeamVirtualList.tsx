'use client'

// Design Ref: §5 /team — 80명 가상 스크롤 리스트 (react-window v2)
import { List, type RowComponentProps } from 'react-window'
import Link from 'next/link'
import type { TeamMemberWithAttendance } from '@/types'

interface RowProps {
  members: TeamMemberWithAttendance[]
  currentUserId: string | null
}

const ATTENDANCE_LABEL: Record<string, { label: string; cls: string }> = {
  present: { label: '출근', cls: 'bg-green-50 text-green-700' },
  late: { label: '지각', cls: 'bg-yellow-50 text-yellow-700' },
  absent: { label: '결근', cls: 'bg-red-50 text-red-700' },
  pto: { label: '휴가', cls: 'bg-blue-50 text-blue-700' },
  sick: { label: '병가', cls: 'bg-purple-50 text-purple-700' },
}

function Row({ index, style, members, currentUserId }: RowComponentProps<RowProps>) {
  const m = members[index]
  if (!m) return null
  const isMe = currentUserId === m.id
  const att = m.todayAttendance ? ATTENDANCE_LABEL[m.todayAttendance] : null

  return (
    <div style={style} className="px-1">
      <Link
        href={`/team/${m.id}`}
        className="card flex items-center gap-3 h-[72px] hover:shadow-toss transition-shadow"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
          {(m.name ?? '?').slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 truncate">{m.name ?? '이름 없음'}</span>
            {isMe && (
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded">나</span>
            )}
            <span className="text-xs text-gray-500">
              {m.role === 'admin' ? '팀장' : '팀원'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            공유 자료 {m.sharedResourceCount}건 · 공개 고객 {m.publicContactCount}명
          </div>
        </div>
        {att && (
          <span className={`text-xs px-2 py-1 rounded ${att.cls}`}>{att.label}</span>
        )}
      </Link>
    </div>
  )
}

export default function TeamVirtualList({
  members,
  currentUserId,
  height = 600,
}: {
  members: TeamMemberWithAttendance[]
  currentUserId: string | null
  height?: number
}) {
  if (members.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">팀원이 없습니다</div>
  }

  return (
    <List
      rowComponent={Row}
      rowCount={members.length}
      rowHeight={80}
      rowProps={{ members, currentUserId }}
      style={{ height }}
      overscanCount={4}
    />
  )
}
