'use client'

import { useRef, useState } from 'react'
import {
  useImageAssets,
  useImageUsage,
  useUploadImage,
  useDeleteImage,
  useSetImageShared,
  useUpdateImage,
} from '../hooks/useImageAssets'
import { imageAssetService } from '../services'
import { IMAGE_LIMITS } from '@/types'
import type { ImageAsset } from '@/types'
import ShareBadge from './ShareBadge'

export default function ImagePanel() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ImageAsset | null>(null)
  const { data, isLoading } = useImageAssets({ search: search || undefined })
  const { data: usage } = useImageUsage()
  const setShared = useSetImageShared()
  const [progress, setProgress] = useState(0)
  const upload = useUploadImage((p) => setProgress(p))
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setProgress(0)
    const title = prompt('이미지 제목', file.name.replace(/\.[^.]+$/, ''))
    if (!title) {
      if (fileInput.current) fileInput.current.value = ''
      return
    }
    try {
      await upload.mutateAsync({ file, title })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const usedMB = usage ? (usage.totalSize / (1024 * 1024)).toFixed(2) : '0'
  const maxMB = ((IMAGE_LIMITS.MAX_PER_USER * IMAGE_LIMITS.MAX_FILE_SIZE) / (1024 * 1024)).toFixed(0)

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            사용량: {usage?.count ?? 0} / {IMAGE_LIMITS.MAX_PER_USER}장 · {usedMB} / {maxMB} MB
          </span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending || (usage?.count ?? 0) >= IMAGE_LIMITS.MAX_PER_USER}
            className="btn-primary"
          >
            {upload.isPending ? '업로드 중...' : '+ 이미지 추가'}
          </button>
        </div>
        <div className="w-full bg-gray-100 h-1 rounded">
          <div
            className="bg-primary h-1 rounded transition-all"
            style={{
              width: `${Math.min(100, ((usage?.count ?? 0) / IMAGE_LIMITS.MAX_PER_USER) * 100)}%`,
            }}
          />
        </div>
        {upload.isPending && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{progress < 65 ? '압축 중...' : progress < 90 ? '업로드 중...' : '저장 중...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {uploadError && (
          <p className="text-sm text-red-500 mt-2">{uploadError}</p>
        )}
      </div>

      <input
        type="text"
        placeholder="제목으로 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full"
      />

      {isLoading && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-gray-400 text-sm py-8 text-center">이미지가 없습니다</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data?.map((img) => (
          <button
            key={img.id}
            onClick={() => setSelected(img)}
            className="card p-2 text-left hover:shadow-toss transition-shadow"
          >
            <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageAssetService.getPublicUrl(img.storage_path)}
                alt={img.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-gray-900 truncate flex-1">{img.title}</span>
              <ShareBadge
                isShared={img.is_shared}
                onToggle={() => setShared.mutate({ id: img.id, isShared: !img.is_shared })}
                disabled={setShared.isPending}
              />
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <ImageDetail image={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function ImageDetail({ image, onClose }: { image: ImageAsset; onClose: () => void }) {
  const del = useDeleteImage()
  const update = useUpdateImage()
  const [title, setTitle] = useState(image.title)

  const save = async () => {
    if (title !== image.title) {
      await update.mutateAsync({ id: image.id, patch: { title } })
    }
    onClose()
  }

  const remove = async () => {
    if (!confirm('삭제하시겠습니까?')) return
    await del.mutateAsync(image.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-toss-xl p-4 max-w-lg w-full max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageAssetService.getPublicUrl(image.storage_path)}
          alt={image.title}
          className="w-full max-h-96 object-contain bg-gray-50 rounded mb-3"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={remove}
            disabled={del.isPending}
            className="btn-secondary text-red-500"
          >
            삭제
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-secondary">
            닫기
          </button>
          <button onClick={save} disabled={update.isPending} className="btn-primary">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
