'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { MessageSquare, ChevronRight, Clock, User } from 'lucide-react'

type ConversationSummary = {
  id: string
  otherProfile: { user_id: string; nickname: string; avatar_url: string | null } | null
  latestMessage: string | null
  updatedAt: string
}

export default function MessagesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setLoading(false); return }

      const { data: mRes } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', auth.user.id)
      const ids = (mRes ?? []).map(r => r.conversation_id as string)
      if (ids.length === 0) { setItems([]); setLoading(false); return }

      const [cRes, memRes, msgRes, bRes] = await Promise.all([
        supabase.from('conversations').select('id,updated_at').in('id', ids).order('updated_at', { ascending: false }),
        supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids),
        supabase.from('messages').select('conversation_id,message,created_at').in('conversation_id', ids).order('created_at', { ascending: false }),
        supabase.from('blocks').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${auth.user.id}`)
      ])

      const latestMsgs = new Map(); (msgRes.data ?? []).forEach(m => { if (!latestMsgs.has(m.conversation_id)) latestMsgs.set(m.conversation_id, m) })
      const oIds = Array.from(new Set((memRes.data ?? []).filter(m => m.user_id !== auth.user.id).map(m => m.user_id)))
      const { data: pRes } = await supabase.from('profiles').select('user_id,nickname,avatar_url').in('user_id', oIds)
      const pMap = new Map((pRes ?? []).map(p => [p.user_id, p]))
      const bIds = new Set((bRes ?? []).map(r => r.blocker_user_id === auth.user.id ? r.blocked_user_id : r.blocker_user_id))

      const summaries = (cRes.data ?? []).map(c => {
        const oMem = (memRes.data ?? []).find(m => m.conversation_id === c.id && m.user_id !== auth.user.id)
        return {
          id: c.id,
          otherProfile: oMem ? pMap.get(oMem.user_id) ?? null : null,
          latestMessage: latestMsgs.get(c.id)?.message ?? null,
          updatedAt: latestMsgs.get(c.id)?.created_at ?? c.updated_at,
        }
      }).filter(i => !i.otherProfile || !bIds.has(i.otherProfile.user_id))

      setItems(summaries); setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-background pb-32 text-[18px]">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">대화함</h1>
          <p className="mt-2 text-muted-foreground font-medium">소중한 인연과 이야기를 나누어 보세요.</p>
        </header>

        <AppNav />

        <div className="space-y-4 mt-8">
          {items.map((item) => (
            <Link key={item.id} href={`/messages/${item.id}`} className="group">
              <article className="bg-white p-5 rounded-[28px] border border-border/50 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <ProfileAvatar avatarUrl={item.otherProfile?.avatar_url ?? null} nickname={item.otherProfile?.nickname ?? '자'} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {item.otherProfile?.nickname ?? '알 수 없는 사용자'}
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock size={12} />
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate leading-relaxed">
                    {item.latestMessage ?? '먼저 인사를 건네보세요.'}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground/30 group-hover:text-primary transition-colors" size={20} />
              </article>
            </Link>
          ))}

          {items.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-border">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                <MessageSquare size={40} />
              </div>
              <p className="text-muted-foreground font-bold">아직 진행 중인 대화가 없어요.</p>
              <Link href="/people" className="mt-4 inline-block text-primary font-bold hover:underline underline-offset-4">
                새로운 인연 찾아보기
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ProfileAvatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-sm" />
  ) : (
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground ring-2 ring-white shadow-sm">
      {nickname.slice(0, 1)}
    </div>
  )
}

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
