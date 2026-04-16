import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        targetUserId?: string | null
        groupId?: string | null
        messageId?: number | null
        reason?: string
        detail?: string
      }
    | null

  if (!body?.reason?.trim()) {
    return NextResponse.json({ error: '신고 사유를 입력해 주세요.' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_user_id: user.id,
    target_user_id: body.targetUserId ?? null,
    group_id: body.groupId ?? null,
    message_id: body.messageId ?? null,
    reason: body.reason.trim(),
    detail: body.detail?.trim() || null,
    status: 'open',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
