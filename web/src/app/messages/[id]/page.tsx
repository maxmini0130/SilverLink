'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SafetyActions } from '@/components/safety-actions'
import { ChevronLeft, Send, User, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const router = useRouter()
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
    let channel: any = null

    ;(async () => {
      setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setLoading(false); return }

      const { data: membership } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', conversationId).eq('user_id', auth.user.id).maybeSingle()
      if (!membership) { if (active) { setError('이 대화에 접근할 수 없습니다.'); setLoading(false) }; return }

      const [membersRes, messagesRes] = await Promise.all([
        supabase.from('conversation_members').select('user_id').eq('conversation_id', conversationId),
        supabase.from('messages').select('id,user_id,message,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
      ])

      const otherMemberId = (membersRes.data ?? []).find(m => m.user_id !== auth.user.id)?.user_id
      if (otherMemberId) {
        const { data: block } = await supabase.from('blocks').select('blocker_user_id').or(`and(blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${otherMemberId}),and(blocker_user_id.eq.${otherMemberId},blocked_user_id.eq.${auth.user.id})`).maybeSingle()
        if (block) { if (active) { setError('차단 관계로 인해 대화가 중단되었습니다.'); setLoading(false) }; return }
        const { data: profile } = await supabase.from('profiles').select('user_id,nickname,avatar_url').eq('user_id', otherMemberId).maybeSingle()
        setOtherProfile(profile as ProfileRow)
      }

      if (!active) return
      setCurrentUserId(auth.user.id)
      setMessages((messagesRes.data ?? []) as MessageRow[])
      setLoading(false)

      channel = supabase.channel(`messages:${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const next = payload.new as MessageRow
        setMessages((prev) => (prev.some((row) => row.id === next.id) ? prev : [...prev, next]))
      }).subscribe()
    })()
    return () => { active = false; if (channel) supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    const msg = text.trim(); if (!msg || !currentUserId) return
    setText('')
    const { data: inserted, error: insertError } = await supabase.from('messages').insert({ conversation_id: conversationId, user_id: currentUserId, message: msg }).select().single()
    if (inserted) {
      setMessages((p) => (p.some((r) => r.id === (inserted as MessageRow).id) ? p : [...p, inserted as MessageRow]))
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error) return <div className="p-10 text-center font-bold text-red-500 bg-red-50">{error}</div>

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-2xl mx-auto shadow-xl ring-1 ring-border/50">
      {/* 상단바 */}
      <header className="px-5 py-4 border-b border-border/50 bg-white sticky top-0 z-20 flex items-center gap-4">
        <Link href="/messages" className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-foreground hover:bg-primary/10 transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <Link href={`/people/${otherProfile?.user_id}`} className="flex-1 flex items-center gap-3">
          <ProfileAvatar avatarUrl={otherProfile?.avatar_url ?? null} nickname={otherProfile?.nickname ?? '자'} size="sm" />
          <div>
            <h2 className="text-xl font-black text-foreground">{otherProfile?.nickname ?? '대화 상대'}</h2>
            <div className="flex items-center gap-1 text-xs text-primary font-bold">
              <ShieldCheck size={12} />
              인증 회원
            </div>
          </div>
        </Link>
        {otherProfile && <SafetyActions targetUserId={otherProfile.user_id} compact />}
      </header>

      {/* 대화 영역 */}
      <main className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#FAF8F5]">
        {messages.map((row) => {
          const mine = row.user_id === currentUserId
          return (
            <div key={row.id} className={cn("flex flex-col max-w-[85%]", mine ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={cn("px-5 py-3.5 rounded-[24px] text-lg font-medium shadow-sm leading-relaxed", mine ? "bg-primary text-white rounded-br-none" : "bg-white text-foreground rounded-bl-none")}>
                {row.message}
              </div>
              <span className="text-[11px] font-bold text-muted-foreground mt-1.5 px-1 uppercase tracking-tighter">
                {formatTime(row.created_at)}
              </span>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center py-20 text-muted-foreground/50 font-bold italic">
            따뜻한 첫 인사를 건네보세요.
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* 입력창 */}
      <div className="p-5 pb-8 bg-white border-t border-border/50 sticky bottom-0 z-10">
        <div className="flex gap-3 items-center bg-muted/30 p-2 rounded-[28px] focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="따뜻한 마음을 전하세요..."
            className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-[18px] font-medium placeholder:text-muted-foreground/40"
          />
          <button
            onClick={sendMessage}
            className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileAvatar({ avatarUrl, nickname, size = "md" }: { avatarUrl: string | null; nickname: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-10 h-10 text-sm" : "w-14 h-14 text-xl"
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className={cn(s, "rounded-full object-cover ring-2 ring-white shadow-sm")} />
  ) : (
    <div className={cn(s, "rounded-full bg-muted flex items-center justify-center font-black text-muted-foreground ring-2 ring-white shadow-sm")}>
      {nickname.slice(0, 1)}
    </div>
  )
}

function formatTime(v: string) {
  const d = new Date(v)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}
