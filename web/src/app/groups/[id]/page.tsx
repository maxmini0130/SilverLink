'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SilverButton } from '@/components/common/silver-button'
import { Users, MapPin, Tag, ChevronLeft, ShieldCheck, MessageSquare, Info, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type GroupRow = {
  id: string
  title: string
  category: string
  region: string
  description: string
  max_members: number
  owner_user_id: string
}

export default function GroupDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const groupId = useMemo(() => params.id, [params.id])

  const [group, setGroup] = useState<GroupRow | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return
      setCurrentUserId(user.id)

      const { data: g, error: gerr } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,owner_user_id')
        .eq('id', groupId)
        .maybeSingle()

      if (gerr) setError(gerr.message)
      setGroup((g as GroupRow) ?? null)

      const [memRes, countRes] = await Promise.all([
        supabase.from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
      ])

      setIsMember(!!memRes.data)
      setMemberCount(countRes.count ?? 0)
      setLoading(false)
    })()
  }, [groupId, supabase])

  async function join() {
    if (!group || !currentUserId) return
    if (memberCount >= group.max_members) {
      setError('정원이 가득 찼어요.')
      return
    }
    setError(null)
    setBusy(true)
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: currentUserId, role: 'member' })
    if (error) setError(error.message)
    else { setIsMember(true); setMemberCount((prev) => prev + 1) }
    setBusy(false)
  }

  async function leave() {
    if (!currentUserId || !group) return
    if (group.owner_user_id === currentUserId) {
      setError('모임장은 모임을 나갈 수 없어요.')
      return
    }
    if (!window.confirm('이 모임에서 나가시겠어요?')) return
    setError(null)
    setBusy(true)
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', currentUserId)
    if (error) setError(error.message)
    else { setIsMember(false); setMemberCount((prev) => Math.max(0, prev - 1)) }
    setBusy(false)
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (!group) return <div className="p-10 text-center font-bold text-muted-foreground">모임을 찾을 수 없어요.</div>

  const isOwner = group.owner_user_id === currentUserId
  const isFull = memberCount >= group.max_members

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto">
        <div className="px-5 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <Link href="/groups" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-border/50 text-foreground">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="font-bold text-lg">모임 상세</h2>
          <div className="w-10"></div>
        </div>

        <section className="px-5 mt-4">
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-border/50 p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase tracking-wider">
                {group.category}
              </span>
              {isOwner && (
                <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} />
                  내가 만든 모임
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-foreground mb-6 leading-tight">{group.title}</h1>
            
            <div className="grid gap-4 mb-8">
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-[20px]">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">장소</div>
                  <div className="text-lg font-bold text-foreground">{group.region} 근처</div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-[20px]">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">참여 인원</div>
                  <div className="text-lg font-bold text-foreground">현재 {memberCount}명 <span className="text-muted-foreground/50 font-medium">/ 정원 {group.max_members}명</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Info size={20} className="text-primary" />
                모임 소개
              </h3>
              <div className="bg-muted/10 p-6 rounded-[24px] text-foreground leading-relaxed whitespace-pre-wrap text-[17px]">
                {group.description || '작성된 모임 소개가 없습니다.'}
              </div>
            </div>

            {error && <p className="text-red-500 font-bold mb-6 text-center bg-red-50 p-3 rounded-xl">{error}</p>}

            <div className="flex flex-col gap-4">
              {isMember ? (
                <>
                  <SilverButton variant="primary" className="w-full" icon={<MessageSquare />} onClick={() => router.push(`/groups/${groupId}/chat`)}>
                    채팅방 들어가기
                  </SilverButton>
                  {!isOwner && (
                    <>
                      <button onClick={leave} disabled={busy} className="text-muted-foreground text-sm font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-2 py-4">
                        <LogOut size={16} />
                        모임에서 나갈까요?
                      </button>
                      <p className="text-sm text-muted-foreground text-center -mt-2">
                        모임을 나가도 이미 맺은 1촌과 대화는 유지돼요.
                      </p>
                    </>
                  )}
                </>
              ) : (
                <SilverButton variant="primary" disabled={busy || isFull} className="w-full" onClick={join}>
                  {busy ? '처리 중...' : isFull ? '정원 마감' : '모임 참여하기'}
                </SilverButton>
              )}
            </div>
          </div>
        </section>
      </main>

      <AppNav />
    </div>
  )
}
