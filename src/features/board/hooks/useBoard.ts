'use client'

// Design Ref: §5.4 게시판 — TanStack Query + Realtime
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { boardService, type PostListFilter } from '../services/boardService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { PostCategory } from '@/types'

export function usePosts(filter: PostListFilter = {}) {
  const { user } = useAuth()
  const teamId = user?.team_id
  return useQuery({
    queryKey: ['board', 'posts', teamId, filter],
    queryFn: () => boardService.list(teamId!, filter),
    enabled: !!teamId,
    staleTime: 30_000,
  })
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['board', 'post', postId],
    queryFn: () => boardService.getById(postId!),
    enabled: !!postId,
  })
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['board', 'comments', postId],
    queryFn: () => boardService.listComments(postId!),
    enabled: !!postId,
  })
}

export function useCreatePost() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      category: PostCategory
      title: string
      body: string
      is_pinned?: boolean
    }) => {
      if (!user?.team_id || !user?.id) throw new Error('로그인이 필요합니다')
      return boardService.create({
        team_id: user.team_id,
        author_id: user.id,
        ...input,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', 'posts'] })
    },
  })
}

export function useUpdatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, patch }: { postId: string; patch: Parameters<typeof boardService.update>[1] }) =>
      boardService.update(postId, patch),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['board', 'posts'] })
      qc.invalidateQueries({ queryKey: ['board', 'post', v.postId] })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => boardService.remove(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', 'posts'] })
    },
  })
}

export function useToggleLike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, delta }: { postId: string; delta: 1 | -1 }) =>
      boardService.toggleLike(postId, delta),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['board', 'post', v.postId] })
      qc.invalidateQueries({ queryKey: ['board', 'posts'] })
    },
  })
}

export function useAddComment(postId: string) {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => {
      if (!user?.id) throw new Error('로그인이 필요합니다')
      return boardService.addComment({ post_id: postId, author_id: user.id, body })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', 'comments', postId] })
      qc.invalidateQueries({ queryKey: ['board', 'post', postId] })
      qc.invalidateQueries({ queryKey: ['board', 'posts'] })
    },
  })
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => boardService.removeComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', 'comments', postId] })
      qc.invalidateQueries({ queryKey: ['board', 'post', postId] })
    },
  })
}

export function useBoardRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        qc.invalidateQueries({ queryKey: ['board'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        const postId =
          (payload.new && 'post_id' in payload.new && (payload.new as { post_id: string }).post_id) ||
          (payload.old && 'post_id' in payload.old && (payload.old as { post_id: string }).post_id)
        if (postId) {
          qc.invalidateQueries({ queryKey: ['board', 'comments', postId] })
          qc.invalidateQueries({ queryKey: ['board', 'post', postId] })
        }
        qc.invalidateQueries({ queryKey: ['board', 'posts'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
