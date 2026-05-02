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
