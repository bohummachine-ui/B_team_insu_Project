// Design Ref: §3.1 — 18개 테이블 스키마

export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended'
export type UserRole = 'member' | 'admin'
export type AttendanceStatus =
  | 'office' | 'field' | 'remote' | 'hospital'
  | 'dayoff' | 'vacation' | 'checkout'
export type PostCategory = 'notice' | 'free' | 'case' | 'qna'
export type LibraryCategory = 'script' | 'template' | 'image' | 'recording' | 'case' | 'memo'
export type TemplateCategory = 'greeting' | 'info' | 'proposal' | 'closing'
export type FavoriteTarget = 'script' | 'template' | 'image' | 'recording' | 'case'
export type Gender = 'M' | 'F'

// Row types (defined outside Database to avoid circular self-reference)
type TeamsRow = {
  id: string; name: string; owner_user_id: string | null; created_at: string
}
type UsersRow = {
  id: string; email: string; name: string | null; status: UserStatus; role: UserRole
  team_id: string | null; profile_image_url: string | null; google_refresh_token: string | null
  gemini_key_secret_id: string | null
  approved_at: string | null; approved_by_user_id: string | null; last_login_at: string | null
  created_at: string
}
type OfficeIpsRow = {
  id: string; team_id: string; ip_address: string; label: string | null
  created_by: string; created_at: string
}
type AttendanceLogsRow = {
  id: string; user_id: string; date: string; status: AttendanceStatus
  ip_address: string | null; is_office: boolean; first_logged_at: string; updated_at: string
}
type ContactsRow = {
  id: string; owner_user_id: string; team_id: string; name: string; phone: string
  carrier: string | null; birthday: string | null; gender: Gender | null; email: string | null
  address: string | null; job: string | null; job_detail: string | null; job_code: string | null
  weight: number | null; height: number | null; drives: boolean; smokes: boolean
  family_info: string | null; memo: string | null; next_contact_date: string | null
  is_shared: boolean; shared_at: string | null; created_at: string; updated_at: string
}
type LabelsRow = {
  id: string; team_id: string; name: string; color: string; sort_order: number
}
type ContactLabelsRow = { contact_id: string; label_id: string }
type ScriptsRow = {
  id: string; team_id: string; owner_user_id: string; title: string; body: string
  tags: string[] | null; is_shared: boolean; created_at: string; updated_at: string
}
type MessageTemplatesRow = {
  id: string; team_id: string; owner_user_id: string; title: string; body: string
  category: TemplateCategory | null; is_shared: boolean; use_count: number
  created_at: string; updated_at: string
}
type ImageAssetsRow = {
  id: string; team_id: string; owner_user_id: string; title: string; tags: string[] | null
  storage_path: string; thumbnail_path: string | null; file_size: number | null
  is_shared: boolean; use_count: number; created_at: string
}
export type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed'

type RecordingsRow = {
  id: string; team_id: string; owner_user_id: string; title: string; duration: number | null
  drive_file_id: string | null; drive_share_link: string | null; consent_confirmed: boolean
  is_shared: boolean; created_at: string
  transcript: string | null
  transcript_status: TranscriptStatus
  transcript_model: string | null
  transcript_error: string | null
  transcribed_at: string | null
}
type CaseStudiesRow = {
  id: string; team_id: string; owner_user_id: string; title: string; body: string
  outcome: 'success' | 'fail' | null; is_shared: boolean; created_at: string
}
type PersonalMemosRow = {
  id: string; owner_user_id: string; title: string; body: string; created_at: string
}
type PostsRow = {
  id: string; team_id: string; author_id: string; category: PostCategory
  title: string; body: string; is_pinned: boolean; likes_count: number; created_at: string
}
type CommentsRow = {
  id: string; post_id: string; author_id: string; body: string; created_at: string
}
type FavoritesRow = {
  id: string; user_id: string; target_type: FavoriteTarget; target_id: string; created_at: string
}

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: TeamsRow
        Insert: Omit<TeamsRow, 'id' | 'created_at'>
        Update: Partial<Omit<TeamsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      users: {
        Row: UsersRow
        Insert: {
          id: string
          email: string
          name?: string | null
          status: UserStatus
          role: UserRole
          team_id?: string | null
          profile_image_url?: string | null
          google_refresh_token?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          last_login_at?: string | null
        }
        Update: Partial<Omit<UsersRow, 'created_at'>>
        Relationships: []
      }
      office_ips: {
        Row: OfficeIpsRow
        Insert: Omit<OfficeIpsRow, 'id' | 'created_at'>
        Update: Partial<Omit<OfficeIpsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      attendance_logs: {
        Row: AttendanceLogsRow
        Insert: {
          user_id: string
          date: string
          status: AttendanceStatus
          ip_address?: string | null
          is_office?: boolean
        }
        Update: Partial<Omit<AttendanceLogsRow, 'id' | 'first_logged_at'>>
        Relationships: []
      }
      contacts: {
        Row: ContactsRow
        Insert: Omit<ContactsRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContactsRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      labels: {
        Row: LabelsRow
        Insert: Omit<LabelsRow, 'id'>
        Update: Partial<Omit<LabelsRow, 'id'>>
        Relationships: []
      }
      contact_labels: {
        Row: ContactLabelsRow
        Insert: ContactLabelsRow
        Update: never
        Relationships: []
      }
      scripts: {
        Row: ScriptsRow
        Insert: Omit<ScriptsRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ScriptsRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      message_templates: {
        Row: MessageTemplatesRow
        Insert: Omit<MessageTemplatesRow, 'id' | 'use_count' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MessageTemplatesRow, 'id' | 'use_count' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      image_assets: {
        Row: ImageAssetsRow
        Insert: Omit<ImageAssetsRow, 'id' | 'use_count' | 'created_at'>
        Update: Partial<Omit<ImageAssetsRow, 'id' | 'use_count' | 'created_at'>>
        Relationships: []
      }
      recordings: {
        Row: RecordingsRow
        Insert: Omit<
          RecordingsRow,
          'id' | 'created_at' | 'transcript' | 'transcript_status'
          | 'transcript_model' | 'transcript_error' | 'transcribed_at'
        > & {
          transcript?: string | null
          transcript_status?: TranscriptStatus
          transcript_model?: string | null
          transcript_error?: string | null
          transcribed_at?: string | null
        }
        Update: Partial<Omit<RecordingsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      case_studies: {
        Row: CaseStudiesRow
        Insert: Omit<CaseStudiesRow, 'id' | 'created_at'>
        Update: Partial<Omit<CaseStudiesRow, 'id' | 'created_at'>>
        Relationships: []
      }
      personal_memos: {
        Row: PersonalMemosRow
        Insert: Omit<PersonalMemosRow, 'id' | 'created_at'>
        Update: Partial<Omit<PersonalMemosRow, 'id' | 'created_at'>>
        Relationships: []
      }
      posts: {
        Row: PostsRow
        Insert: Omit<PostsRow, 'id' | 'likes_count' | 'created_at'>
        Update: Partial<Omit<PostsRow, 'id' | 'likes_count' | 'created_at'>>
        Relationships: []
      }
      comments: {
        Row: CommentsRow
        Insert: Omit<CommentsRow, 'id' | 'created_at'>
        Update: Partial<Omit<CommentsRow, 'id' | 'created_at'>>
        Relationships: []
      }
      favorites: {
        Row: FavoritesRow
        Insert: Omit<FavoritesRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
    }
    Views: {
      contacts_shared_view: {
        Row: {
          id: string; owner_user_id: string; team_id: string
          name: string; phone: string; birthday: string | null
          gender: Gender | null; age: number | null
          job: string | null; job_detail: string | null
          next_contact_date: string | null; is_shared: true; created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      set_user_gemini_key: {
        Args: { p_key: string }
        Returns: void
      }
      delete_user_gemini_key: {
        Args: Record<string, never>
        Returns: void
      }
      get_user_gemini_key: {
        Args: { p_user_id: string }
        Returns: string | null
      }
      has_user_gemini_key: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
