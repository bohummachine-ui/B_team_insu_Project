import TeamMemberDetail from '@/features/team/components/TeamMemberDetail'

export default function Page({ params }: { params: { userId: string } }) {
  return <TeamMemberDetail userId={params.userId} />
}
