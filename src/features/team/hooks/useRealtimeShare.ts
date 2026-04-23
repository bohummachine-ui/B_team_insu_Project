'use client'

// Design Ref: §4.3 — 자료 공유 토글 Realtime 구독 (message_templates 등)
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

type ShareTable = 'scripts' | 'message_templates' | 'image_assets' | 'recordings' | 'case_studies' | 'contacts'

const INVALIDATE_KEYS: Record<ShareTable, string[][]> = {
  scripts: [['library-scripts'], ['hub'], ['team-members', 'scripts']],
  message_templates: [['library-templates'], ['hub'], ['team-members', 'templates']],
  image_assets: [['library-images'], ['hub'], ['team-members', 'images']],
  recordings: [['library-recordings'], ['hub'], ['team-members', 'recordings']],
  case_studies: [['library-cases'], ['hub'], ['team-members', 'cases']],
  contacts: [['contacts'], ['team-members']],
}

export function useRealtimeShare(tables: ShareTable[] = ['message_templates', 'scripts', 'image_assets']) {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('team-share-' + tables.join('-'))

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table },
        () => {
          for (const key of INVALIDATE_KEYS[table] ?? []) {
            qc.invalidateQueries({ queryKey: key })
          }
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')])
}
