// Design Ref: §3 posts/comments, §5.4 게시판
import { createClient } from '@/lib/supabase/client'
import type {
  Post,
  PostWithAuthor,
  PostCategory,
  CommentWithAuthor,
} from '@/types'

export interface PostListFilter {
  category?: PostCategory | 'all'
  search?: string
}

export const boardService = {
  async list(teamId: string, filter: PostListFilter = {}): Promise<PostWithAuthor[]> {
    const supabase = createClient()
    let query = supabase
      .from('posts')
      .select('*')
      .eq('team_id', teamId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (filter.category && filter.category !== 'all') {
      query = query.eq('category', filter.category)
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`)
    }

    const { data: posts, error } = await query.limit(200)
    if (error) throw error

    const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)))
    const postIds = (posts ?? []).map((p) => p.id)

    const [authorsRes, commentsRes] = await Promise.all([
      authorIds.length
        ? supabase.from('users').select('id,name,profile_image_url').in('id', authorIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; profile_image_url: string | null }> }),
      postIds.length
        ? supabase.from('comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    ])

    const authorMap = new Map(
      (authorsRes.data ?? []).map((a) => [a.id, { name: a.name, img: a.profile_image_url }])
    )
    const commentCount = new Map<string, number>()
    for (const c of commentsRes.data ?? []) {
      commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1)
    }

    return (posts ?? []).map((p) => ({
      ...p,
      author_name: authorMap.get(p.author_id)?.name ?? null,
      author_profile_image_url: authorMap.get(p.author_id)?.img ?? null,
      comment_count: commentCount.get(p.id) ?? 0,
    }))
  },

  async getById(postId: string): Promise<PostWithAuthor | null> {
    const supabase = createClient()
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (error || !post) return null

    const { data: author } = await supabase
      .from('users')
      .select('id,name,profile_image_url')
      .eq('id', post.author_id)
      .single()

    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    return {
      ...post,
      author_name: author?.name ?? null,
      author_profile_image_url: author?.profile_image_url ?? null,
      comment_count: count ?? 0,
    }
  },

  async create(input: {
    team_id: string
    author_id: string
    category: PostCategory
    title: string
    body: string
    is_pinned?: boolean
  }): Promise<Post> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('posts')
      .insert({
        team_id: input.team_id,
        author_id: input.author_id,
        category: input.category,
        title: input.title,
        body: input.body,
        is_pinned: input.is_pinned ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(
    postId: string,
    patch: { title?: string; body?: string; category?: PostCategory; is_pinned?: boolean }
  ): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('posts').update(patch).eq('id', postId)
    if (error) throw error
  },

  async remove(postId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) throw error
  },

  async toggleLike(postId: string, delta: 1 | -1): Promise<void> {
    const supabase = createClient()
    const { data: current } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single()
    const next = Math.max(0, (current?.likes_count ?? 0) + delta)
    const { error } = await supabase
      .from('posts')
      // likes_count는 Insert/Update 타입에서 제외돼 있어 캐스팅 (DB 컬럼은 UPDATE 가능)
      .update({ likes_count: next } as never)
      .eq('id', postId)
    if (error) throw error
  },

  // Comments
  async listComments(postId: string): Promise<CommentWithAuthor[]> {
    const supabase = createClient()
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error

    const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id)))
    const { data: authors } = authorIds.length
      ? await supabase.from('users').select('id,name,profile_image_url').in('id', authorIds)
      : { data: [] as Array<{ id: string; name: string | null; profile_image_url: string | null }> }

    const authorMap = new Map(
      (authors ?? []).map((a) => [a.id, { name: a.name, img: a.profile_image_url }])
    )

    return (comments ?? []).map((c) => ({
      ...c,
      author_name: authorMap.get(c.author_id)?.name ?? null,
      author_profile_image_url: authorMap.get(c.author_id)?.img ?? null,
    }))
  },

  async addComment(input: { post_id: string; author_id: string; body: string }) {
    const supabase = createClient()
    const { error } = await supabase.from('comments').insert(input)
    if (error) throw error
  },

  async removeComment(commentId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) throw error
  },
}
