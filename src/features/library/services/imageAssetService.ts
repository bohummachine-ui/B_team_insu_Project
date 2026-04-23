// Design Ref: §5 — Image Assets + Supabase Storage 업로드 (Plan FR-12)
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import { getOwnerContext } from './libraryHelpers'
import { validateImageFile, validateImageCount } from '../utils/imageValidation'
import { IMAGE_LIMITS } from '@/types'
import type { ImageAsset, ImageAssetUpdate } from '@/types'

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
} as const

const BUCKET = 'library-images'

export interface ImageListFilter {
  search?: string
  tags?: string[]
  isShared?: boolean | null
}

export interface ImageUploadInput {
  file: File
  title: string
  tags?: string[]
  isShared?: boolean
}

export interface ImageUsageStats {
  count: number
  maxCount: number
  totalSize: number
  maxSize: number
}

export const imageAssetService = {
  async list(filter: ImageListFilter = {}): Promise<ImageAsset[]> {
    const supabase = createClient()
    let query = supabase.from('image_assets').select('*')

    if (filter.search) {
      query = query.ilike('title', `%${filter.search}%`)
    }
    if (typeof filter.isShared === 'boolean') {
      query = query.eq('is_shared', filter.isShared)
    }
    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<ImageAsset | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('image_assets')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getOwnUsage(): Promise<ImageUsageStats> {
    const supabase = createClient()
    const { userId } = await getOwnerContext()
    const { data } = await supabase
      .from('image_assets')
      .select('file_size')
      .eq('owner_user_id', userId)
    const rows = data ?? []
    const totalSize = rows.reduce((sum, r) => sum + (r.file_size ?? 0), 0)
    return {
      count: rows.length,
      maxCount: IMAGE_LIMITS.MAX_PER_USER,
      totalSize,
      maxSize: IMAGE_LIMITS.MAX_PER_USER * IMAGE_LIMITS.MAX_FILE_SIZE,
    }
  },

  // Plan FR-12: 압축(1MB/1920px) → Storage 업로드 → DB insert
  async upload(
    input: ImageUploadInput,
    onProgress?: (percent: number) => void,
  ): Promise<ImageAsset> {
    const fileCheck = validateImageFile(input.file)
    if (!fileCheck.ok) throw new Error(fileCheck.error)

    const supabase = createClient()
    const { userId, teamId } = await getOwnerContext()

    const { count } = await supabase
      .from('image_assets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
    const countCheck = validateImageCount(count ?? 0)
    if (!countCheck.ok) throw new Error(countCheck.error)

    onProgress?.(5)
    const compressed = await imageCompression(input.file, {
      ...COMPRESSION_OPTIONS,
      onProgress: (p) => onProgress?.(5 + Math.round(p * 0.6)),
    })
    onProgress?.(65)

    const storagePath = `${userId}/${crypto.randomUUID()}.jpg`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, compressed, {
        contentType: 'image/jpeg',
        upsert: false,
      })
    if (upErr) throw upErr
    onProgress?.(90)

    const { data, error } = await supabase
      .from('image_assets')
      .insert({
        owner_user_id: userId,
        team_id: teamId,
        title: input.title,
        tags: input.tags ?? null,
        storage_path: storagePath,
        thumbnail_path: null,
        file_size: compressed.size,
        is_shared: input.isShared ?? false,
      })
      .select()
      .single()
    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      throw error
    }
    onProgress?.(100)
    return data
  },

  async update(id: string, patch: ImageAssetUpdate): Promise<ImageAsset> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('image_assets')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient()
    const { data: row } = await supabase
      .from('image_assets')
      .select('storage_path')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('image_assets').delete().eq('id', id)
    if (error) throw error

    if (row?.storage_path) {
      await supabase.storage.from(BUCKET).remove([row.storage_path])
    }
  },

  async setShared(id: string, isShared: boolean): Promise<ImageAsset> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('image_assets')
      .update({ is_shared: isShared })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  getPublicUrl(storagePath: string): string {
    const supabase = createClient()
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    return data.publicUrl
  },

  async incrementUseCount(id: string): Promise<void> {
    const supabase = createClient()
    const { data: row } = await supabase
      .from('image_assets')
      .select('use_count')
      .eq('id', id)
      .single()
    const current = row?.use_count ?? 0
    await supabase
      .from('image_assets')
      .update({ use_count: current + 1 } as never)
      .eq('id', id)
  },
}
