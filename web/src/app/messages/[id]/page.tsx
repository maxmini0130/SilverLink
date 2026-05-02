export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DMClient from './DMClient'

export default async function DMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const uid = auth.user.id

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id_a, user_id_b')
    .eq('id', id)
    .maybeSingle()

  if (!conv || (conv.user_id_a !== uid && conv.user_id_b !== uid)) redirect('/messages')

  const otherId = conv.user_id_a === uid ? conv.user_id_b : conv.user_id_a

  // 차단 관계면 대화 불가
  const { data: blocked } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${uid},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${uid})`)
    .maybeSingle()

  if (blocked) redirect('/messages')

  // 관계 조건 확인: 1촌 OR 상호관심 OR 같은 모임
  const a = uid < otherId ? uid : otherId
  const b = uid < otherId ? otherId : uid

  const [{ data: friendship }, { data: mutualInterest }, { data: sharedGroup }] = await Promise.all([
    supabase.from('friendships').select('id').eq('user_id_a', a).eq('user_id_b', b).maybeSingle(),
    supabase.from('relationship_requests').select('id')
      .eq('from_user_id', otherId).eq('to_user_id', uid).eq('status', 'accepted').maybeSingle(),
    supabase.from('group_members').select('group_id')
      .eq('user_id', uid)
      .in('group_id',
        (await supabase.from('group_members').select('group_id').eq('user_id', otherId)).data?.map((r: any) => r.group_id) ?? []
      ).maybeSingle(),
  ])

  const canChat = !!friendship || !!mutualInterest || !!sharedGroup
  if (!canChat) redirect('/messages')

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', otherId)
    .maybeSingle()

  const { data: messages } = await supabase
    .from('direct_messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return (
    <DMClient
      conversationId={Number(id)}
      myId={uid}
      otherNickname={otherProfile?.nickname ?? '알 수 없음'}
      initialMessages={(messages ?? []) as any}
    />
  )
}
