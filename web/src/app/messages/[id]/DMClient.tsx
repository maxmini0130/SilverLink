'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export type Message = {
  id: number
  sender_id: string
  content: string
  created_at: string
}

export default function DMClient({
  conversationId,
  myId,
  otherId,
  otherNickname,
  initialMessages,
}: {
  conversationId: number
  myId: string
  otherId: string
  otherNickname: string
  initialMessages: Message[]
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const content = text.trim()
    if (!content) return
    setText('')
    setError(null)

    const { error: err } = await supabase.from('direct_messages').insert({
      conversation_id: conversationId,
      sender_id: myId,
      content,
    })

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (!err) {
      await supabase.from('notifications').insert({
        recipient_id: otherId,
        actor_id: myId,
        type: 'message',
        title: '새 대화가 도착했어요',
        body: content.length > 40 ? `${content.slice(0, 40)}...` : content,
        href: `/messages/${conversationId}`,
      })
    } else {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'white', flexShrink: 0 }}>
        <Link href="/messages" style={{ fontSize: 18, textDecoration: 'none', color: 'inherit', minHeight: 'auto' }}>
          목록
        </Link>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>
          {otherNickname[0]}
        </div>
        <span style={{ fontWeight: 700, fontSize: 19 }}>{otherNickname}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--background)' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>첫 메시지를 보내보세요.</div>
        )}
        {messages.map((message) => {
          const isMine = message.sender_id === myId
          return (
            <div key={message.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
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
                {message.content}
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'white', display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="메시지 입력..."
          style={{ flex: 1, minHeight: 52 }}
        />
        <button className="btn-primary" onClick={send} disabled={!text.trim()} style={{ width: 'auto', padding: '12px 20px', flexShrink: 0 }}>
          전송
        </button>
      </div>

      {error && <p className="error-text" style={{ padding: '0 16px 12px' }}>{error}</p>}
    </div>
  )
}
