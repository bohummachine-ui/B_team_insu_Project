'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useContact } from '@/features/contacts/hooks/useContact'
import ContactForm from '@/features/contacts/components/ContactForm'

export default function EditContactPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { data: contact, isLoading } = useContact(id)

  if (isLoading) {
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

  return <ContactForm mode="edit" contact={contact} />
}
