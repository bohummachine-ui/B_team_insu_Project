'use client'

// Design Ref: §5.4 댓글
import { useState } from 'react'
import { useComments, useAddComment, useDeleteComment } from '../hooks/useBoard'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface Props {
  postId: string
}

export default function CommentSection({ postId }: Props) {
  const { user, isAdmin } = useAuth()
  const { data: comments, isLoading } = useComments(postId)
  const addComment = useAddComment(postId)
  const deleteComment = useDeleteComment(postId)
  const [body, setBody] = useState('')

  const submit = async () => {
    if (!body.trim()) return
    try {
      await addComment.mutateAsync(body.trim())
      setBody('')
    } catch (e) {
      alert(e instanceof Error ? e.message : '등록 실패')
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="font-bold text-gray-900">댓글 {comments?.length ?? 0}</h3>

      {isLoading ? (
        <div className="text-gray-400 text-sm py-4">불러오는 중...</div>
      ) : !comments || comments.length === 0 ? (
        <div className="text-gray-400 text-sm py-4 text-center">첫 댓글을 남겨보세요</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const canDelete = user && (c.author_id === user.id || isAdmin)
            return (
              <li key={c.id} className="flex gap-3 p-3 bg-gray-50 rounded-toss">
                {c.author_profile_image_url ? (
                  <img
                    src={c.author_profile_image_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {c.author_name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {c.author_name ?? '익명'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words">
                    {c.body}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm('댓글을 삭제할까요?')) deleteComment.mutate(c.id)
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    삭제
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="댓글 작성..."
          className="input flex-1 min-h-[60px] resize-none"
        />
        <button
          onClick={submit}
          disabled={!body.trim() || addComment.isPending}
          className="btn-primary self-end"
        >
          등록
        </button>
      </div>
    </div>
  )
}
