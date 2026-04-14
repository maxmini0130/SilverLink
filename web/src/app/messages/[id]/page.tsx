'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SafetyActions } from '@/components/safety-actions'

type MessageRow = {
  id: number
  user_id: string
  message: string
  created_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
  avatar_url: string | null
}

export default function MessageDetailPage() {
  const supabase = createClient()
  const params = useParams<{ id: string }>()
  const conversationId = useMemo(() => params.id, [params.id])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

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

      const { data: membership, error: membershipError } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership || membershipError) {
        if (active) {
          setError(membershipError?.message ?? '이 대화에 접근할 수 없습니다.')
          setLoading(false)
        }
        return
      }

      const [membersRes, messagesRes] = await Promise.all([
        supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId),
        supabase
          .from('messages')
          .select('id,user_id,message,created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])

      if (membersRes.error || messagesRes.error) {
        if (active) {
          setError(membersRes.error?.message || messagesRes.error?.message || '대화를 불러오지 못했습니다.')
          setLoading(false)
        }
        return
      }

      const otherMemberId = (membersRes.data ?? [])
        .map((row) => row.user_id as string)
        .find((id) => id !== user.id)

      let profile: ProfileRow | null = null
      if (otherMemberId) {
        const { data: block } = await supabase
          .from('blocks')
          .select('blocker_user_id')
          .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${otherMemberId}),and(blocker_user_id.eq.${otherMemberId},blocked_user_id.eq.${user.id})`)
          .maybeSingle()

        if (block) {
          if (active) {
            setError('차단 관계가 있어 이 대화에 접근할 수 없습니다.')
            setLoading(false)
          }
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('user_id,nickname,avatar_url')
          .eq('user_id', otherMemberId)
          .maybeSingle()
        profile = (data as ProfileRow | null) ?? null
      }

      if (!active) return

      setCurrentUserId(user.id)
      setOtherProfile(profile)
      setMessages((messagesRes.data ?? []) as MessageRow[])
      setLoading(false)

      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as MessageRow])
          }
        )
        .subscribe()

    })()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  async function sendMessage() {
    const message = text.trim()
    if (!message || !currentUserId) return

    setError(null)
    setText('')

    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: currentUserId,
      message,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      <Link href="/messages" style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 대화 목록
      </Link>
      <h1 style={{ marginTop: 14, fontSize: 24, fontWeight: 700 }}>
        {otherProfile?.nickname ?? '개인 대화'}
      </h1>
      {otherProfile && <SafetyActions targetUserId={otherProfile.user_id} compact />}

      <div style={{ marginTop: 16, border: '1px solid #e7e5e4', borderRadius: 18, background: '#fff', padding: 16 }}>
        <div style={{ maxHeight: 480, overflow: 'auto', display: 'grid', gap: 10 }}>
          {messages.map((row) => {
            const mine = row.user_id === currentUserId
            return (
              <div
                key={row.id}
                style={{
                  justifySelf: mine ? 'end' : 'start',
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: 16,
                  background: mine ? '#1c1917' : '#f5f5f4',
                  color: mine ? '#fff' : '#1c1917',
                }}
              >
                <div style={{ fontSize: 15 }}>{row.message}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{formatTime(row.created_at)}</div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 메시지가 없어요. 먼저 인사를 건네보세요.</div>
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
            onClick={() => void sendMessage()}
            style={{ padding: '12px 16px', borderRadius: 10, background: '#1c1917', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
