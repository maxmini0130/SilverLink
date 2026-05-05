export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ConversationRow = {
  id: number
  user_id_a: string
  user_id_b: string
  last_message_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string | null
}

type LastMessageRow = {
  content: string | null
}

type ConversationListItem = ConversationRow & {
  otherNickname: string
  lastMessage: string
}

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const uid = auth.user.id

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, user_id_a, user_id_b, last_message_at')
    .or(`user_id_a.eq.${uid},user_id_b.eq.${uid}`)
    .order('last_message_at', { ascending: false })

  const conversations = (convs ?? []) as ConversationRow[]
  const otherIds = conversations.map((conversation) =>
    conversation.user_id_a === uid ? conversation.user_id_b : conversation.user_id_a
  )

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id, nickname')
    .in('user_id', otherIds.length > 0 ? otherIds : ['none'])

  const nicknameMap: Record<string, string> = {}
  for (const profile of (profileRows ?? []) as ProfileRow[]) {
    nicknameMap[profile.user_id] = profile.nickname ?? '이름 없음'
  }

  const lastMsgMap: Record<number, string> = {}
  for (const conversation of conversations) {
    const { data: lastMsg } = await supabase
      .from('direct_messages')
      .select('content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMsg) lastMsgMap[conversation.id] = ((lastMsg as LastMessageRow).content ?? '')
  }

  const enriched: ConversationListItem[] = conversations.map((conversation) => {
    const otherId = conversation.user_id_a === uid ? conversation.user_id_b : conversation.user_id_a
    return {
      ...conversation,
      otherNickname: nicknameMap[otherId] ?? '이름 없음',
      lastMessage: lastMsgMap[conversation.id] || '아직 메시지가 없어요',
    }
  })

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>대화</h1>

      {enriched.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          아직 대화가 없어요
          <br />
          <Link href="/people" style={{ color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>
            사람 찾기에서 대화를 시작해보세요
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {enriched.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                  {conversation.otherNickname[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{conversation.otherNickname}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conversation.lastMessage}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                  {new Date(conversation.last_message_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
