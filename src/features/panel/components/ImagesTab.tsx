// Design Ref: §5.4 — 우측 패널 이미지 자료 탭
'use client'

import { useState, useMemo } from 'react'
import { useImageAssets } from '@/features/library/hooks/useImageAssets'
import { imageAssetService } from '@/features/library/services'
import { copyImageFromUrl } from '../utils/clipboard'
import { useCopyToast } from '../hooks/useCopyToast'
import Toast from './Toast'

export default function ImagesTab() {
  const [search, setSearch] = useState('')
  const { data: images = [], isLoading } = useImageAssets({ search: search || undefined })
  const toast = useCopyToast()
  const [copyingId, setCopyingId] = useState<string | null>(null)

  const items = useMemo(
    () =>
      images.map((img) => ({
        ...img,
        url: imageAssetService.getPublicUrl(img.storage_path),
      })),
    [images]
  )

  const handleCopy = async (id: string, url: string) => {
    setCopyingId(id)
    try {
      await copyImageFromUrl(url)
      toast.show('이미지 복사됨!')
      void imageAssetService.incrementUseCount(id).catch(() => {})
    } catch (err) {
      toast.show(err instanceof Error ? err.message : '복사 실패', true)
    } finally {
      setCopyingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-100">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이미지 검색"
          className="w-full px-3 py-2 rounded-toss border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && <p className="text-center text-sm text-gray-400 py-8">불러오는 중...</p>}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">등록된 이미지가 없습니다.</p>
            <p className="text-xs mt-1">자료실에서 이미지를 업로드하세요.</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {items.map((img) => (
            <button
              key={img.id}
              onClick={() => handleCopy(img.id, img.url)}
              disabled={copyingId === img.id}
              className="relative aspect-square rounded-toss overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50"
              title={img.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              {copyingId === img.id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs">복사 중...</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                <p className="text-[10px] text-white truncate">{img.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Toast message={toast.message} isError={toast.isError} />
    </div>
  )
}
