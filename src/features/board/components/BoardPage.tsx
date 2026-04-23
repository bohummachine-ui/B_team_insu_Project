'use client'

// Design Ref: §5.4 게시판 (공지/자유/사례공유/Q&A 4탭)
import { useState } from 'react'
import Link from 'next/link'
import { usePosts, useBoardRealtime, useUpdatePost } from '../hooks/useBoard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { POST_CATEGORY_LABEL, POST_CATEGORY_ORDER, type PostCategory } from '@/types'
import PostEditor from './PostEditor'

type Tab = PostCategory | 'all'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: '전체' },
  ...POST_CATEGORY_ORDER.map((c) => ({ key: c, label: POST_CATEGORY_LABEL[c] })),
]

export default function BoardPage() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)

  useBoardRealtime()
  const updatePost = useUpdatePost()

  const handleTogglePin = (e: React.MouseEvent, postId: string, current: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    updatePost.mutate({ postId, patch: { is_pinned: !current } })
  }

  const { data: posts, isLoading } = usePosts({
    category: tab === 'all' ? undefined : tab,
    search: search.trim() || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시판</h1>
          <p className="text-sm text-gray-500 mt-1">팀 공지와 자료를 공유하세요</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="btn-primary"
          disabled={!user?.team_id}
        >
          + 글 작성
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목·본문 검색"
          className="input flex-1 max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
      ) : !posts || posts.length === 0 ? (
        <div className="text-gray-400 text-sm py-12 text-center">
          아직 게시글이 없습니다
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/board/${p.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, p.id, p.is_pinned)}
                    className={`mt-1 w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
                      p.is_pinned
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                    }`}
                    title={p.is_pinned ? '고정 해제' : '상단 고정'}
                  >
                    📌
                  </button>
                ) : (
                  p.is_pinned && (
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-xs font-bold">
                      📌
                    </span>
                  )
                )}
                <span
                  className={`mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    p.category === 'notice'
                      ? 'bg-red-50 text-red-600'
                      : p.category === 'case'
                      ? 'bg-green-50 text-green-600'
                      : p.category === 'qna'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {POST_CATEGORY_LABEL[p.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{p.title}</span>
                    {p.comment_count > 0 && (
                      <span className="text-xs text-gray-500">[{p.comment_count}]</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {p.body.slice(0, 100)}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                  <div>{p.author_name ?? '익명'}</div>
                  <div className="mt-0.5">{p.created_at.slice(0, 10)}</div>
                  {p.likes_count > 0 && (
                    <div className="mt-0.5 text-red-500">♥ {p.likes_count}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showEditor && (
        <PostEditor
          onClose={() => setShowEditor(false)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
