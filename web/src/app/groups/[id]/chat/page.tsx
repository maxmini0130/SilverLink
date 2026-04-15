'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map())
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  async function fetchNicknames(userIds: string[], current: Map<string, string>) {
    const missing = userIds.filter((id) => !current.has(id))
    if (missing.length === 0) return current

    const { data } = await supabase
      .from('profiles')
      .select('user_id,nickname')
      .in('user_id', missing)

    const updated = new Map(current)
    for (const row of data ?? []) {
      updated.set(row.user_id, row.nickname ?? row.user_id.slice(0, 8))
    }
    return updated
  }

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        if (active) {
          setError('로그인이 필요합니다.')
          setLoading(false)
        }
        return
      }

      setCurrentUserId(user.id)

      // 멤버 여부 확인
      const { data: membership } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        if (active) {
          setError('이 모임의 멤버가 아닙니다. 먼저 모임에 참여해 주세요.')
          setLoading(false)
        }
        return
      }

      const { data, error: msgError } = await supabase
        .from('group_messages')
        .select('id,user_id,message,created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (msgError) {
        if (active) {
          setError(msgError.message)
          setLoading(false)
        }
        return
      }

      const msgs = (data ?? []) as Msg[]
      const uniqueIds = Array.from(new Set(msgs.map((m) => m.user_id)))
      const nicknameMap = await fetchNicknames(uniqueIds, new Map())

      if (!active) return

      setMessages(msgs)
      setNicknames(nicknameMap)
      setLoading(false)

      channel = supabase
        .channel(`group_messages:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Msg
            setMessages((prev) => [...prev, newMsg])
            setNicknames((prev) => {
              if (prev.has(newMsg.user_id)) return prev
              // 백그라운드에서 닉네임 가져오기
              fetchNicknames([newMsg.user_id], prev).then((updated) => {
                setNicknames(updated)
              })
              return prev
            })
          }
        )
        .subscribe()
    })()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const msg = text.trim()
    if (!msg || !currentUserId) return
    setText('')
    setError(null)

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      user_id: currentUserId,
      message: msg,
    })

    if (error) setError(error.message)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Link href={`/groups/${groupId}`} style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 모임 상세
      </Link>
      <p style={{ marginTop: 16, color: 'crimson' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Link href={`/groups/${groupId}`} style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 모임 상세
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>모임 채팅</h1>

      <div style={{ marginTop: 16, border: '1px solid #e7e5e4', borderRadius: 18, background: '#fff', padding: 16 }}>
        <div style={{ maxHeight: 460, overflowY: 'auto', display: 'grid', gap: 10 }}>
          {messages.map((m) => {
            const mine = m.user_id === currentUserId
            const nickname = nicknames.get(m.user_id) ?? m.user_id.slice(0, 8)
            return (
              <div
                key={m.id}
                style={{
                  justifySelf: mine ? 'end' : 'start',
                  maxWidth: '78%',
                }}
              >
                {!mine && (
                  <Link
                    href={`/people/${m.user_id}`}
                    style={{ fontSize: 12, color: '#78716c', marginBottom: 4, paddingLeft: 4, display: 'block', textDecoration: 'none' }}
                  >
                    {nickname}
                  </Link>
                )}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 16,
                    background: mine ? '#1c1917' : '#f5f5f4',
                    color: mine ? '#fff' : '#1c1917',
                  }}
                >
                  <div style={{ fontSize: 15 }}>{m.message}</div>
                  <div style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}>
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 메시지가 없어요. 첫 인사를 건네보세요.</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력 (Enter로 전송)"
            style={{ flex: 1, padding: 12, fontSize: 16, borderRadius: 10, border: '1px solid #d6d3d1' }}
          />
          <button
            onClick={() => void send()}
            style={{ padding: '12px 16px', borderRadius: 10, background: '#1c1917', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            전송
          </button>
        </div>

        {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
