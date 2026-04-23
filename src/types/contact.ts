import type { Database } from './database.types'

export type Contact = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type ContactSharedView = Database['public']['Views']['contacts_shared_view']['Row']
export type Label = Database['public']['Tables']['labels']['Row']

export interface ContactWithLabels extends Contact {
  labels: Label[]
}
