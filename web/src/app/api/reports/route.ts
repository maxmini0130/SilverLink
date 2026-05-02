import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_REASONS = ['욕설/비방', '사기/금융 권유', '스팸/광고', '불건전한 내용', '개인정보 노출', '기타']

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { reported_user_id, reason, detail } = await req.json()

  if (!reported_user_id || !reason) {
    return NextResponse.json({ error: 'reported_user_id와 reason이 필요합니다.' }, { status: 400 })
  }

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: '유효하지 않은 신고 사유입니다.' }, { status: 400 })
  }

  if (reported_user_id === auth.user.id) {
    return NextResponse.json({ error: '본인을 신고할 수 없어요.' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: auth.user.id,
    reported_user_id,
    reason,
    detail: (detail ?? '').slice(0, 500),
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('events').insert({
    user_id: auth.user.id,
    event_type: 'report_submitted',
    payload: { reported_user_id, reason },
  })

  return NextResponse.json({ success: true })
}
