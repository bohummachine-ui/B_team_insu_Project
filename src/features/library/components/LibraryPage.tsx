'use client'

import { useState } from 'react'
import type { LibraryTab } from '@/types'
import LibraryTabs from './LibraryTabs'
import ScriptPanel from './ScriptPanel'
import TemplatePanel from './TemplatePanel'
import ImagePanel from './ImagePanel'
import RecordingPanel from './RecordingPanel'
import CasePanel from './CasePanel'
import MemoPanel from './MemoPanel'

export default function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('scripts')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">라이브러리</h1>
        <p className="text-sm text-gray-500 mt-1">
          스크립트, 메시지 템플릿, 이미지, 녹취록, 사례, 개인 메모를 관리하고 팀과 공유합니다
        </p>
      </div>

      <LibraryTabs current={tab} onChange={setTab} />

      <div className="pt-2">
        {tab === 'scripts' && <ScriptPanel />}
        {tab === 'templates' && <TemplatePanel />}
        {tab === 'images' && <ImagePanel />}
        {tab === 'recordings' && <RecordingPanel />}
        {tab === 'cases' && <CasePanel />}
        {tab === 'memos' && <MemoPanel />}
      </div>
    </div>
  )
}
