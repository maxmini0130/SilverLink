'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Msg = {
  id: number
  user_id: string
  message: string
  created_at: string
  nickname?: string
}

export default function GroupChatPage() {
  const supabase = createClient()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const groupId = useMemo(() => params.id, [params.id])

  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [groupTitle, setGroupTitle] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const nicknameCache = useRef<Record<string, string>>({})

  async function getNickname(userId: string): Promise<string> {
    if (nicknameCache.current[userId]) return nicknameCache.current[userId]
    const { data } = await supabase.from('profiles').select('nickname').eq('user_id', userId).maybeSingle()
    const name = data?.nickname ?? userId.slice(0, 6)
    nicknameCache.current[userId] = name
    return name
  }

  async function enrichMessages(msgs: Omit<Msg, 'nickname'>[]): Promise<Msg[]> {
    return Promise.all(
      msgs.map(async (m) => ({ ...m, nickname: await getNickname(m.user_id) }))
    )
  }

  useEffect(() => {
    ;(async () => {
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { router.replace('/login'); return }
      setMyId(auth.user.id)

      // 비멤버 접근 차단
      const { data: memberCheck } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (!memberCheck) { router.replace(`/groups/${groupId}`); return }

      const { data: group } = await supabase.from('groups').select('title').eq('id', groupId).maybeSingle()
      if (group) setGroupTitle(group.title)

      const { data, error } = await supabase
        .from('group_messages')
        .select('id,user_id,message,created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (error) setError(error.message)
      const enriched = await enrichMessages((data ?? []) as Omit<Msg, 'nickname'>[])
      setMessages(enriched)

      const channel = supabase
        .channel(`group_messages:${groupId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
          async (payload) => {
            const newMsg = payload.new as Omit<Msg, 'nickname'>
            const nickname = await getNickname(newMsg.user_id)
            setMessages((prev) => [...prev, { ...newMsg, nickname }])
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })()
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const msg = text.trim()
    if (!msg) return
    setText('')
    setError(null)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      user_id: auth.user.id,
      message: msg,
    })

    if (error) setError(error.message)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 640, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'white', flexShrink: 0 }}>
        <Link href={`/groups/${groupId}`} style={{ fontSize: 22, textDecoration: 'none', color: 'inherit', minHeight: 'auto' }}>←</Link>
        <span style={{ fontWeight: 700, fontSize: 19 }}>{groupTitle || '모임 채팅'}</span>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--background)' }}>
        {messages.map((m) => {
          const isMine = m.user_id === myId
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              {!isMine && <span style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{m.nickname}</span>}
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMine ? 'var(--primary)' : 'white',
                color: isMine ? 'white' : 'var(--foreground)',
                border: isMine ? 'none' : '1px solid var(--border)',
                fontSize: 17,
                lineHeight: 1.5,
              }}>
                {m.message}
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'white', display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="메시지 입력..."
          style={{ flex: 1 }}
        />
        <button className="btn-primary" onClick={send} disabled={!text.trim()} style={{ width: 'auto', padding: '12px 20px', flexShrink: 0 }}>
          전송
        </button>
      </div>

      {error && <p className="error-text" style={{ padding: '0 16px 12px' }}>{error}</p>}
    </div>
  )
}
