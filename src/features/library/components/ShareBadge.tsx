'use client'

interface Props {
  isShared: boolean
  onToggle?: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function ShareBadge({ isShared, onToggle, size = 'sm', disabled }: Props) {
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  const icon = isShared ? '🌐' : '🔒'
  const label = isShared ? '팀 공유' : '비공개'
  const color = isShared
    ? 'bg-primary/10 text-primary'
    : 'bg-gray-100 text-gray-600'

  if (!onToggle) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${cls} ${color}`}>
        <span>{icon}</span>
        {label}
      </span>
    )
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onToggle()
      }}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-full transition-colors ${cls} ${color} hover:opacity-80 disabled:opacity-50`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}
