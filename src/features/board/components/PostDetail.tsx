'use client'

// Design Ref: §5.4 게시글 상세 + 좋아요 + 댓글
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePost, useDeletePost, useToggleLike, useBoardRealtime } from '../hooks/useBoard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { POST_CATEGORY_LABEL } from '@/types'
import CommentSection from './CommentSection'
import PostEditor from './PostEditor'

interface Props {
  postId: string
}

export default function PostDetail({ postId }: Props) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { data: post, isLoading } = usePost(postId)
  const deletePost = useDeletePost()
  const toggleLike = useToggleLike()
  const [editing, setEditing] = useState(false)
  const [liked, setLiked] = useState(false)

  useBoardRealtime()

  if (isLoading) {
    return <div className="text-gray-400 text-sm py-8 text-center">불러오는 중...</div>
  }
  if (!post) {
    return (
      <div className="text-gray-400 text-sm py-8 text-center">
        게시글을 찾을 수 없습니다
        <div className="mt-3">
          <Link href="/board" className="text-primary text-sm hover:underline">
            목록으로
          </Link>
        </div>
      </div>
    )
  }

  const canEdit = user && (post.author_id === user.id || isAdmin)

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, delta: liked ? -1 : 1 })
    setLiked((v) => !v)
  }

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    try {
      await deletePost.mutateAsync(post.id)
      router.push('/board')
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/board" className="text-gray-500 hover:text-gray-900">
          ← 목록
        </Link>
      </div>

      <article className="card">
        <div className="flex items-start gap-3 mb-4">
          {post.is_pinned && (
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-bold">
              📌 고정
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              post.category === 'notice'
                ? 'bg-red-50 text-red-600'
                : post.category === 'case'
                ? 'bg-green-50 text-green-600'
                : post.category === 'qna'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {POST_CATEGORY_LABEL[post.category]}
          </span>
          <div className="flex-1" />
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-900"
              >
                수정
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-red-500 hover:underline"
                disabled={deletePost.isPending}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
          {post.author_profile_image_url ? (
            <img
              src={post.author_profile_image_url}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">
                {post.author_name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}
          <span>{post.author_name ?? '익명'}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
        </div>

        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap break-words">
          {post.body}
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-toss text-sm font-medium transition-colors
              ${liked ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}
            `}
          >
            <span>{liked ? '♥' : '♡'}</span>
            <span>좋아요 {post.likes_count}</span>
          </button>
          <span className="text-sm text-gray-500">댓글 {post.comment_count}</span>
        </div>

        <CommentSection postId={post.id} />
      </article>

      {editing && (
        <PostEditor
          onClose={() => setEditing(false)}
          isAdmin={isAdmin}
          editing={post}
        />
      )}
    </div>
  )
}
