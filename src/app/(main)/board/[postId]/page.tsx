import PostDetail from '@/features/board/components/PostDetail'

export default function Page({ params }: { params: { postId: string } }) {
  return <PostDetail postId={params.postId} />
}
