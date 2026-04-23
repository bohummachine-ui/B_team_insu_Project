'use client'

// Design Ref: §5.4 게시글 작성/수정 모달
import { useState } from 'react'
import { useCreatePost, useUpdatePost } from '../hooks/useBoard'
import { POST_CATEGORY_LABEL, POST_CATEGORY_ORDER, type PostCategory, type Post } from '@/types'

interface Props {
  onClose: () => void
  isAdmin: boolean
  editing?: Post
}

export default function PostEditor({ onClose, isAdmin, editing }: Props) {
  const [category, setCategory] = useState<PostCategory>(editing?.category ?? 'free')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [body, setBody] = useState(editing?.body ?? '')
  const [isPinned, setIsPinned] = useState(editing?.is_pinned ?? false)
  const [error, setError] = useState<string | null>(null)

  const create = useCreatePost()
  const update = useUpdatePost()

  const isNotice = category === 'notice'
  const loading = create.isPending || update.isPending

  const handleSubmit = async () => {
    setError(null)
    if (!title.trim()) return setError('제목을 입력하세요')
    if (!body.trim()) return setError('본문을 입력하세요')
    if (isNotice && !isAdmin) return setError('공지는 팀장만 작성할 수 있습니다')
    try {
      if (editing) {
        await update.mutateAsync({
          postId: editing.id,
          patch: {
            category,
            title: title.trim(),
            body: body.trim(),
            is_pinned: isAdmin ? isPinned : editing.is_pinned,
          },
        })
      } else {
        await create.mutateAsync({
          category,
          title: title.trim(),
          body: body.trim(),
          is_pinned: isAdmin ? isPinned : false,
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-toss-xl shadow-toss-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 mb-4">
          {editing ? '게시글 수정' : '게시글 작성'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {POST_CATEGORY_ORDER.map((c) => {
                const disabled = c === 'notice' && !isAdmin
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => !disabled && setCategory(c)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-toss text-sm font-medium
                      ${category === c
                        ? 'bg-primary-50 text-primary border border-primary-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }
                      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                  >
                    {POST_CATEGORY_LABEL[c]}
                    {c === 'notice' && !isAdmin && ' (팀장만)'}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              maxLength={200}
              placeholder="제목을 입력하세요"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">본문</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input w-full min-h-[200px] resize-y"
              placeholder="내용을 입력하세요"
            />
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              상단 고정 (공지/중요 글)
            </label>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary" disabled={loading}>
              취소
            </button>
            <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
              {loading ? '저장 중...' : editing ? '수정' : '작성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
