import type { Database } from './database.types'

export type Script = Database['public']['Tables']['scripts']['Row']
export type ScriptInsert = Database['public']['Tables']['scripts']['Insert']
export type ScriptUpdate = Database['public']['Tables']['scripts']['Update']

export type MessageTemplate = Database['public']['Tables']['message_templates']['Row']
export type MessageTemplateInsert = Database['public']['Tables']['message_templates']['Insert']
export type MessageTemplateUpdate = Database['public']['Tables']['message_templates']['Update']

export type ImageAsset = Database['public']['Tables']['image_assets']['Row']
export type ImageAssetInsert = Database['public']['Tables']['image_assets']['Insert']
export type ImageAssetUpdate = Database['public']['Tables']['image_assets']['Update']

export type Recording = Database['public']['Tables']['recordings']['Row']
export type RecordingInsert = Database['public']['Tables']['recordings']['Insert']
export type RecordingUpdate = Database['public']['Tables']['recordings']['Update']

export type CaseStudy = Database['public']['Tables']['case_studies']['Row']
export type CaseStudyInsert = Database['public']['Tables']['case_studies']['Insert']
export type CaseStudyUpdate = Database['public']['Tables']['case_studies']['Update']

export type PersonalMemo = Database['public']['Tables']['personal_memos']['Row']
export type PersonalMemoInsert = Database['public']['Tables']['personal_memos']['Insert']
export type PersonalMemoUpdate = Database['public']['Tables']['personal_memos']['Update']

export type LibraryTab = 'scripts' | 'templates' | 'images' | 'recordings' | 'cases' | 'memos'

// Design §5 — 이미지 제한 (Plan FR-12)
export const IMAGE_LIMITS = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_PER_USER: 20,
} as const

// Design §3.4 — 템플릿 카테고리 라벨
export const TEMPLATE_CATEGORY_LABEL: Record<string, string> = {
  greeting: '인사',
  info: '안내',
  proposal: '제안',
  closing: '마무리',
}
