'use client'

import { useQuery } from '@tanstack/react-query'
import { teamService, type TeamMemberListFilter } from '../services'

export function useTeamMembers(filter: TeamMemberListFilter = {}) {
  return useQuery({
    queryKey: ['team-members', 'list', filter],
    queryFn: () => teamService.list(filter),
  })
}

export function useTeamMember(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'detail', userId],
    queryFn: () => (userId ? teamService.get(userId) : null),
    enabled: !!userId,
  })
}

export function useMemberPublicContacts(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'contacts', userId],
    queryFn: () => (userId ? teamService.getPublicContacts(userId) : []),
    enabled: !!userId,
  })
}

export function useMemberSharedScripts(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'scripts', userId],
    queryFn: () => (userId ? teamService.getSharedScripts(userId) : []),
    enabled: !!userId,
  })
}

export function useMemberSharedTemplates(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'templates', userId],
    queryFn: () => (userId ? teamService.getSharedTemplates(userId) : []),
    enabled: !!userId,
  })
}

export function useMemberSharedImages(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'images', userId],
    queryFn: () => (userId ? teamService.getSharedImages(userId) : []),
    enabled: !!userId,
  })
}

export function useMemberSharedRecordings(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'recordings', userId],
    queryFn: () => (userId ? teamService.getSharedRecordings(userId) : []),
    enabled: !!userId,
  })
}

export function useMemberSharedCases(userId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', 'cases', userId],
    queryFn: () => (userId ? teamService.getSharedCases(userId) : []),
    enabled: !!userId,
  })
}
