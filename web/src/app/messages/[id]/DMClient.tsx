'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: number
  sender_id: string
  content: string
  created_at: string
}

export default function DMClient({
  conversationId,
  myId,
  otherNickname,
  initialMessages,
}: {
  conversationId: number
  myId: string
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

    // 마지막 메시지 시간 갱신
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (err) setError(err.message)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 640, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'white', flexShrink: 0 }}>
        <Link href="/messages" style={{ fontSize: 22, textDecoration: 'none', color: 'inherit', minHeight: 'auto' }}>←</Link>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>
          {otherNickname[0]}
        </div>
        <span style={{ fontWeight: 700, fontSize: 19 }}>{otherNickname}</span>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--background)' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>첫 메시지를 보내보세요!</div>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === myId
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
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
                {m.content}
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
          style={{ flex: 1, minHeight: 52 }}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={!text.trim()}
          style={{ width: 'auto', padding: '12px 20px', flexShrink: 0 }}
        >
          전송
        </button>
      </div>

      {error && <p className="error-text" style={{ padding: '0 16px 12px' }}>{error}</p>}
    </div>
  )
}
