// Design Ref: §2.3 — Supabase BaaS direct access, no intermediate layer
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
