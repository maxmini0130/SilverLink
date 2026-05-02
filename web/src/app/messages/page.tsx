export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  // 상대방 닉네임 조회
  const otherIds = (convs ?? []).map((c: any) => c.user_id_a === uid ? c.user_id_b : c.user_id_a)
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id, nickname')
    .in('user_id', otherIds.length > 0 ? otherIds : ['none'])

  const nicknameMap: Record<string, string> = {}
  for (const p of profileRows ?? []) {
    nicknameMap[(p as any).user_id] = (p as any).nickname
  }

  // 각 대화의 마지막 메시지
  const convIds = (convs ?? []).map((c: any) => c.id)
  const lastMsgMap: Record<number, string> = {}
  if (convIds.length > 0) {
    for (const convId of convIds) {
      const { data: lastMsg } = await supabase
        .from('direct_messages')
        .select('content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastMsg) lastMsgMap[convId] = (lastMsg as any).content
    }
  }

  const enriched = (convs ?? []).map((c: any) => {
    const otherId = c.user_id_a === uid ? c.user_id_b : c.user_id_a
    return {
      ...c,
      otherNickname: nicknameMap[otherId] ?? '알 수 없음',
      lastMessage: lastMsgMap[c.id] ?? '아직 메시지가 없어요',
    }
  })

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>채팅</h1>

      {enriched.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          아직 대화가 없어요.<br />
          <Link href="/people" style={{ color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>
            사람 탐색에서 대화 시작하기
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {enriched.map((c: any) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                  {c.otherNickname[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{c.otherNickname}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessage}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                  {new Date(c.last_message_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
