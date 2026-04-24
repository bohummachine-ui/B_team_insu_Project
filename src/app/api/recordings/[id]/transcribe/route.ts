// Design Ref: §4.4 POST, §4.5 GET — /api/recordings/[id]/transcribe
// Plan SC-1: idempotent 실행 / SC-2: Vault 경유 / SC-3: 20MB / SC-4: 공유 시 캐시된 transcript 재사용
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { runTranscribe } from '@/features/recordings/services/transcribeService'

export const runtime = 'nodejs'
// Gemini STT는 수십 초가 걸릴 수 있어 Vercel 기본 타임아웃을 올려둠
export const maxDuration = 300

interface RouteCtx {
  params: { id: string }
}

export async function POST(_req: Request, { params }: RouteCtx) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const recordingId = params.id
  if (!recordingId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const result = await runTranscribe(recordingId, session.user.id)

  if (result.code === 'done') {
    return NextResponse.json(
      { status: 'done', transcript: result.transcript },
      { status: 200 }
    )
  }
  return NextResponse.json(
    { error: result.error ?? result.code },
    { status: result.httpStatus }
  )
}

export async function GET(_req: Request, { params }: RouteCtx) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const recordingId = params.id
  if (!recordingId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  // admin client로 읽기 — RLS 우회하되 아래에서 owner/공유 수동 검증
  const admin = createAdminSupabaseClient()
  const { data: rec, error } = await admin
    .from('recordings')
    .select(
      'id, owner_user_id, is_shared, transcript, transcript_status, transcript_model, transcript_error, transcribed_at'
    )
    .eq('id', recordingId)
    .maybeSingle()

  if (error || !rec) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const isOwner = rec.owner_user_id === session.user.id
  if (!isOwner && !rec.is_shared) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    status: rec.transcript_status,
    transcript: rec.transcript_status === 'done' ? rec.transcript : null,
    error: rec.transcript_status === 'failed' ? rec.transcript_error : null,
    model: rec.transcript_model,
    transcribedAt: rec.transcribed_at,
  })
}
