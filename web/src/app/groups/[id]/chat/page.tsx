'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Send } from 'lucide-react'

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
    const { data } = await supabase.from('profiles').select('user_id,nickname').in('user_id', missing)
    const updated = new Map(current)
    for (const row of data ?? []) updated.set(row.user_id, row.nickname ?? row.user_id.slice(0, 8))
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
      if (!user) { if (active) { setError('로그인이 필요합니다.'); setLoading(false) } return }
      setCurrentUserId(user.id)

      const { data: membership } = await supabase.from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle()
      if (!membership) { if (active) { setError('이 모임의 멤버가 아닙니다. 먼저 모임에 참여해 주세요.'); setLoading(false) } return }

      const { data, error: msgError } = await supabase.from('group_messages').select('id,user_id,message,created_at').eq('group_id', groupId).order('created_at', { ascending: true })
      if (msgError) { if (active) { setError(msgError.message); setLoading(false) } return }

      const msgs = (data ?? []) as Msg[]
      const uniqueIds = Array.from(new Set(msgs.map((m) => m.user_id)))
      const nicknameMap = await fetchNicknames(uniqueIds, new Map())
      if (!active) return

      setMessages(msgs)
      setNicknames(nicknameMap)
      setLoading(false)

      channel = supabase.channel(`group_messages:${groupId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
          async (payload) => {
            const newMsg = payload.new as Msg
            setMessages((prev) => [...prev, newMsg])
            setNicknames((prev) => {
              if (prev.has(newMsg.user_id)) return prev
              fetchNicknames([newMsg.user_id], prev).then((updated) => setNicknames(updated))
              return prev
            })
          }
        ).subscribe()
    })()

    return () => { active = false; if (channel) supabase.removeChannel(channel) }
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
    const { error } = await supabase.from('group_messages').insert({ group_id: groupId, user_id: currentUserId, message: msg })
    if (error) setError(error.message)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  if (error) return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-4xl shadow-sm border border-border/50 max-w-md w-full text-center">
        <p className="text-red-500 font-bold mb-6">{error}</p>
        <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
          <ChevronLeft size={20} />
          모임 상세로 돌아가기
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 상단 헤더 */}
      <div className="px-5 py-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/30">
        <Link href={`/groups/${groupId}`} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-border/50 text-foreground shrink-0">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-bold text-lg">모임 채팅</h1>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-w-2xl mx-auto w-full pb-24">
        {messages.map((m) => {
          const mine = m.user_id === currentUserId
          const nickname = nicknames.get(m.user_id) ?? m.user_id.slice(0, 8)
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <Link
                  href={`/people/${m.user_id}`}
                  className="text-xs text-muted-foreground mb-1 pl-1 hover:text-primary transition-colors font-semibold"
                >
                  {nickname}
                </Link>
              )}
              <div
                className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                  mine
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white border border-border/50 text-foreground rounded-bl-sm'
                }`}
              >
                <p className="text-[15px] leading-relaxed">{m.message}</p>
                <p className={`text-[11px] mt-1 ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center py-20 text-muted-foreground font-medium">
            아직 메시지가 없어요. 첫 인사를 건네보세요.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            className="flex-1 px-4 py-3 rounded-2xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => void send()}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
        {error && <p className="text-center text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
