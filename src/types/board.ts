// Design Ref: §3 posts/comments/favorites, §5.4 게시판 UI
import type { Database, PostCategory } from './database.types'

export type Post = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']

export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentInsert = Database['public']['Tables']['comments']['Insert']

export interface PostWithAuthor extends Post {
  author_name: string | null
  author_profile_image_url: string | null
  comment_count: number
}

export interface CommentWithAuthor extends Comment {
  author_name: string | null
  author_profile_image_url: string | null
}

export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  notice: '공지',
  free: '자유',
  case: '사례공유',
  qna: 'Q&A',
}

export const POST_CATEGORY_ORDER: PostCategory[] = ['notice', 'free', 'case', 'qna']

export type { PostCategory }
