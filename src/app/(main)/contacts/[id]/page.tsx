'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useContact } from '@/features/contacts/hooks/useContact'
import { useAuth } from '@/features/auth/hooks/useAuth'
import ContactDetail from '@/features/contacts/components/ContactDetail'

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { data: contact, isLoading } = useContact(id)
  const { user, isLoading: authLoading } = useAuth()

  if (isLoading || authLoading) {
    return <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
  }

  if (!contact) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm mb-4">고객을 찾을 수 없습니다</p>
        <Link href="/contacts" className="text-primary text-sm hover:underline">
          ← 주소록으로
        </Link>
      </div>
    )
  }

  const role = user?.role === 'admin' ? 'admin' : 'member'
  return <ContactDetail contact={contact} userRole={role} />
}
