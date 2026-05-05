export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DMClient, { type Message } from './DMClient'

type ConversationRow = {
  id: number
  user_id_a: string
  user_id_b: string
}

type GroupMemberRow = {
  group_id: string
}

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

  const conversation = conv as ConversationRow | null
  if (!conversation || (conversation.user_id_a !== uid && conversation.user_id_b !== uid)) {
    redirect('/messages')
  }

  const otherId = conversation.user_id_a === uid ? conversation.user_id_b : conversation.user_id_a

  const { data: blocked } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${uid},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${uid})`)
    .maybeSingle()

  if (blocked) redirect('/messages')

  const a = uid < otherId ? uid : otherId
  const b = uid < otherId ? otherId : uid

  const { data: otherGroups } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', otherId)

  const otherGroupIds = ((otherGroups ?? []) as GroupMemberRow[]).map((row) => row.group_id)

  const [{ data: friendship }, { data: mutualInterest }, { data: sharedGroup }] = await Promise.all([
    supabase.from('friendships').select('id').eq('user_id_a', a).eq('user_id_b', b).maybeSingle(),
    supabase.from('relationship_requests').select('id')
      .eq('from_user_id', otherId).eq('to_user_id', uid).eq('status', 'accepted').maybeSingle(),
    otherGroupIds.length > 0
      ? supabase.from('group_members').select('group_id')
        .eq('user_id', uid)
        .in('group_id', otherGroupIds)
        .maybeSingle()
      : Promise.resolve({ data: null }),
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
      otherId={otherId}
      otherNickname={otherProfile?.nickname ?? '이름 없음'}
      initialMessages={(messages ?? []) as Message[]}
    />
  )
}
