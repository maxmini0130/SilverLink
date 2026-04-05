'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Msg = {
  id: number
  user_id: string
  message: string
  created_at: string
}

export default function GroupChatPage() {
  const supabase = createClient()
  const params = useParams<{ id: string }>()
  const groupId = useMemo(() => params.id, [params.id])

  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      // 초기 로드
      const { data, error } = await supabase
        .from('group_messages')
        .select('id,user_id,message,created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (error) setError(error.message)
      setMessages((data ?? []) as Msg[])

      // Realtime 구독
      const channel = supabase
        .channel(`group_messages:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Msg])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })()
  }, [groupId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const msg = text.trim()
    if (!msg) return
    setText('')
    setError(null)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      user_id: user.id,
      message: msg,
    })

    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>모임 채팅</h1>

      <div style={{ marginTop: 12, border: '1px solid #333', borderRadius: 12, padding: 12 }}>
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ padding: '6px 0' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{m.user_id.slice(0, 8)}</div>
              <div style={{ fontSize: 16 }}>{m.message}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1, padding: 12, fontSize: 16 }}
            placeholder="메시지 입력"
          />
          <button onClick={send} style={{ padding: 12 }}>
            전송
          </button>
        </div>

        {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  )
}