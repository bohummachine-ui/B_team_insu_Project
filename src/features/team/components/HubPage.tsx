'use client'

// Design Ref: §5 /hub — 통합 자료 Hub (5종 공유 자료 + 즐겨찾기 + 검색 + 작성자/기간 필터)
import { useMemo, useState } from 'react'
import { useHub } from '../hooks/useHub'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites'
import { useRealtimeShare } from '../hooks/useRealtimeShare'
import { imageAssetService } from '@/features/library/services'
import { renderTemplate } from '@/features/library/utils/renderTemplate'
import type { HubItem, HubTab, HubFilter, FavoriteTarget } from '@/types'

const TABS: Array<{ key: HubTab; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'script', label: '스크립트' },
  { key: 'template', label: '템플릿' },
  { key: 'image', label: '이미지' },
  { key: 'recording', label: '녹취록' },
  { key: 'case', label: '사례' },
]

const TYPE_TO_FAVORITE: Record<HubItem['type'], FavoriteTarget> = {
  script: 'script',
  template: 'template',
  image: 'image',
  recording: 'recording',
  case: 'case',
}

const TYPE_LABEL: Record<HubItem['type'], string> = {
  script: '스크립트',
  template: '템플릿',
  image: '이미지',
  recording: '녹취록',
  case: '사례',
}

export default function HubPage() {
  const [tab, setTab] = useState<HubTab>('all')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<NonNullable<HubFilter['dateRange']>>('all')
  const [authorIds, setAuthorIds] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [authorOpen, setAuthorOpen] = useState(false)

  useRealtimeShare(['scripts', 'message_templates', 'image_assets', 'recordings', 'case_studies'])

  const { data: members } = useTeamMembers({ sortBy: 'name' })
  const { data: items, isLoading } = useHub({
    tab,
    search: search || undefined,
    dateRange,
    authorIds: authorIds.length > 0 ? authorIds : undefined,
  })
  const fav = useFavorites()
  const toggle = useToggleFavorite()

  const filtered = useMemo(() => {
    if (!items) return []
    if (!favoritesOnly) return items
    return items.filter((i) => fav.isFavorite(TYPE_TO_FAVORITE[i.type], i.id))
  }, [items, favoritesOnly, fav])

  const toggleAuthor = (id: string) => {
    setAuthorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">통합 자료 Hub</h1>
        <p className="text-sm text-gray-500 mt-1">
          팀 전체의 공유 자료를 한 곳에서 검색하고 즐겨찾기하세요
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="제목·본문 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as NonNullable<HubFilter['dateRange']>)}
          className="input"
        >
          <option value="all">전체 기간</option>
          <option value="1w">1주일</option>
          <option value="1m">1개월</option>
          <option value="3m">3개월</option>
        </select>

        <div className="relative">
          <button
            onClick={() => setAuthorOpen((o) => !o)}
            className="btn-secondary text-sm"
          >
            작성자 {authorIds.length > 0 ? `(${authorIds.length})` : ''}
          </button>
          {authorOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-toss shadow-toss-lg border z-10 max-h-64 overflow-auto p-2">
              {(members ?? []).map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={authorIds.includes(m.id)}
                    onChange={() => toggleAuthor(m.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{m.name ?? '이름 없음'}</span>
                </label>
              ))}
              {authorIds.length > 0 && (
                <button
                  onClick={() => setAuthorIds([])}
                  className="w-full text-xs text-gray-500 hover:text-gray-900 mt-1 py-1"
                >
                  선택 해제
                </button>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-1 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
            className="w-4 h-4"
          />
          즐겨찾기만
        </label>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-gray-400 text-sm py-8 text-center">자료가 없습니다</div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => {
          const favType = TYPE_TO_FAVORITE[item.type]
          const isFav = fav.isFavorite(favType, item.id)
          return (
            <HubCard
              key={`${item.type}-${item.id}`}
              item={item}
              isFavorite={isFav}
              onToggleFavorite={() =>
                toggle.mutate({ type: favType, id: item.id, currentlyFavorite: isFav })
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function HubCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: HubItem
  isFavorite: boolean
  onToggleFavorite: () => void
}) {
  const copyText = async () => {
    if (item.type === 'template' && item.body) {
      await navigator.clipboard.writeText(renderTemplate(item.body))
      alert('복사되었습니다')
    } else if (item.type === 'image' && item.storagePath) {
      const url = imageAssetService.getPublicUrl(item.storagePath)
      await navigator.clipboard.writeText(url)
      alert('URL이 복사되었습니다')
    }
  }

  const canCopy = item.type === 'template' || item.type === 'image'

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded">
              {TYPE_LABEL[item.type]}
            </span>
            <h3 className="font-bold text-gray-900">{item.title}</h3>
            {item.outcome && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  item.outcome === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {item.outcome === 'success' ? '성공' : '실패'}
              </span>
            )}
          </div>

          {item.type === 'image' && item.storagePath && (
            <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageAssetService.getPublicUrl(item.storagePath)}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {item.body && (
            <p className="text-sm text-gray-500 whitespace-pre-wrap line-clamp-3">{item.body}</p>
          )}

          <div className="text-xs text-gray-400 mt-1">
            {item.ownerName ?? '알 수 없음'} ·{' '}
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0">
          <button
            onClick={onToggleFavorite}
            aria-label="즐겨찾기"
            className={`text-xl leading-none ${
              isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          {canCopy && (
            <button
              onClick={copyText}
              className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
            >
              복사
            </button>
          )}
          {item.type === 'recording' && item.driveShareLink && (
            <a
              href={item.driveShareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90"
            >
              재생
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
