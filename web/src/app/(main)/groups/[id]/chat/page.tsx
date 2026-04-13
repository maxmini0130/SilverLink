'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/common/UserAvatar'

// ─────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────

type MessageRow = {
  id: string
  content: string
  created_at: string
  sender_id: string
  profiles: {
    nickname: string
    avatar_url: string | null
  } | null
}

// ─────────────────────────────────────────────────────
// 모임 채팅 페이지
// ─────────────────────────────────────────────────────

export default function GroupChatPage() {
  const router = useRouter()
  const { id: groupId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myNickname, setMyNickname] = useState<string>('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // ── 초기 로드 ──
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id ?? null
      setMyUserId(userId)
      if (!userId) return

      // 프로필 조회 (내 닉네임)
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .maybeSingle()
      setMyNickname(profile?.nickname ?? '')

      // 그룹 대화방 조회 (RLS: rls.sql의 conversations SELECT 정책에 group member 추가 필요)
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .eq('group_id', groupId)
        .maybeSingle()

      if (convErr) { setError('채팅방을 불러올 수 없어요.'); setLoading(false); return }
      if (!conv) {
        // 아직 채팅방이 없음 — 모임 상세에서 참여 먼저
        setLoading(false)
        return
      }

      setConversationId(conv.id)

      // 메시지 초기 로드
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, profiles!sender_id(nickname, avatar_url)')
        .eq('conversation_id', conv.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages((msgs ?? []) as unknown as MessageRow[])
      setLoading(false)

      // Realtime 구독
      const channel = supabase
        .channel(`group_chat:${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          async (payload) => {
            // 새 메시지에 프로필 정보 추가 (sender_id로 조회)
            const newMsg = payload.new as { id: string; content: string; created_at: string; sender_id: string }
            const { data: profile } = await supabase
              .from('profiles')
              .select('nickname, avatar_url')
              .eq('id', newMsg.sender_id)
              .maybeSingle()

            setMessages((prev) => [
              ...prev,
              { ...newMsg, profiles: profile ?? null },
            ])
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  // 새 메시지 올 때 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const msg = text.trim()
    if (!msg || !conversationId || !myUserId) return
    setText('')
    setError(null)

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: myUserId,
      content: msg,
    })

    if (error) setError('메시지 전송에 실패했어요.')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ── 로딩 ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  // ── 채팅방 없음 (아직 참여 안 함) ──

  if (!conversationId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">💬</span>
        <p className="text-lg font-medium text-gray-700">채팅방에 입장할 수 없어요.</p>
        <p className="text-sm text-gray-400">모임에 참여하면 채팅이 가능해요.</p>
        <Button variant="outline" onClick={() => router.back()}>
          모임으로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 상단 바 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-2 h-14 flex items-center flex-none">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="뒤로">
          <ChevronLeft size={26} />
        </Button>
        <h1 className="ml-1 text-lg font-bold text-gray-900">모임 채팅</h1>
      </header>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-base text-gray-400">첫 번째로 인사를 건네보세요! 👋</p>
          </div>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === myUserId
          const time = new Date(m.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit',
          })

          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* 상대방 아바타 */}
              {!isMine && (
                <div className="flex flex-col items-center gap-1 flex-none">
                  <UserAvatar
                    nickname={m.profiles?.nickname ?? '?'}
                    avatarUrl={m.profiles?.avatar_url ?? null}
                    size="sm"
                  />
                  <span className="text-xs text-gray-400 leading-none">
                    {m.profiles?.nickname ?? ''}
                  </span>
                </div>
              )}

              {/* 말풍선 */}
              <div
                className={[
                  'max-w-[68%] rounded-2xl px-4 py-2.5 text-base leading-relaxed',
                  isMine
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 rounded-bl-sm shadow-sm',
                ].join(' ')}
              >
                {m.content}
              </div>

              {/* 시간 */}
              <span className="text-xs text-gray-400 flex-none mb-1">{time}</span>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* 하단 입력창 (BottomNav 위에 위치) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-3 py-2 max-w-lg mx-auto">
        {error && (
          <p className="text-xs text-red-500 mb-1 px-1">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-base outline-none placeholder:text-gray-400"
            maxLength={500}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!text.trim()}
            aria-label="전송"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
