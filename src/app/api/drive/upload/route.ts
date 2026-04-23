// Design Ref: §4 /api/drive/upload — Google Drive 업로드 스캐폴딩 (v1.0 stub, v1.1 full impl)
// TODO(v1.1):
//   1. 사용자별 Google OAuth refresh_token 조회 (users.google_refresh_token 컬럼 추가 필요)
//   2. access_token 갱신 → googleapis drive.files.create (multipart upload)
//   3. drive_file_id, webViewLink을 recordings 테이블에 저장
//   4. drive.file scope 권장 (앱이 생성한 파일만 접근)
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 })
  }

  // v1.0: Drive 연동 미구현. 클라이언트에서 수동 링크 입력으로 대체.
  return NextResponse.json(
    {
      error: 'drive_not_configured',
      message: 'Google Drive 연동은 v1.1에서 제공됩니다. 현재는 Drive 링크를 수동으로 붙여넣어주세요.',
    },
    { status: 501 }
  )
}
