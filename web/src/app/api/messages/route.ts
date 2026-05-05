import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FORBIDDEN_PATTERNS = [
  /\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/,
  /\d{4,6}[-\s]?\d{4,6}[-\s]?\d{4,7}/,
  /(사자|수익률|원금보장|고수익|주식|코인|비트코인)/,
]

function hasForbiddenContent(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { conversation_id, content } = await req.json()

  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'conversation_id와 content가 필요합니다.' }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: '메시지는 2000자 이내로 작성해주세요.' }, { status: 400 })
  }

  if (hasForbiddenContent(content)) {
    return NextResponse.json({ error: '전화번호, 계좌번호, 투자 권유 내용은 전송할 수 없어요.' }, { status: 422 })
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('user_id_a, user_id_b')
    .eq('id', conversation_id)
    .maybeSingle()

  if (!conv || (conv.user_id_a !== auth.user.id && conv.user_id_b !== auth.user.id)) {
    return NextResponse.json({ error: '이 대화에 참여할 수 없어요.' }, { status: 403 })
  }

  const { data: msg, error } = await supabase
    .from('direct_messages')
    .insert({ conversation_id, sender_id: auth.user.id, content: content.trim() })
    .select('id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation_id)

  const otherId = conv.user_id_a === auth.user.id ? conv.user_id_b : conv.user_id_a
  await supabase.from('notifications').insert({
    recipient_id: otherId,
    actor_id: auth.user.id,
    type: 'message',
    title: '새 대화가 도착했어요',
    body: content.trim().length > 40 ? `${content.trim().slice(0, 40)}...` : content.trim(),
    href: `/messages/${conversation_id}`,
  })

  return NextResponse.json({ success: true, message_id: msg.id })
}
