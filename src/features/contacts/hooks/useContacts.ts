'use client'

import { useQuery } from '@tanstack/react-query'
import { contactService, type ContactListFilter } from '../services/contactService'

export function useContacts(filter: ContactListFilter = {}) {
  return useQuery({
    queryKey: ['contacts', 'list', filter],
    queryFn: () => contactService.list(filter),
    staleTime: 30 * 1000,
  })
}
