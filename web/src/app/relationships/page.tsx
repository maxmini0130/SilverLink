'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { Heart, Users, MessageSquare, MapPin, ChevronRight } from 'lucide-react'

type ProfileRow = {
  user_id: string
  nickname: string
  region: string | null
  relationship_purpose: string | null
  avatar_url: string | null
}

type ConversationSummary = {
  id: string
  otherProfile: ProfileRow | null
  updatedAt: string
}

export default function RelationshipsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<ProfileRow | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sentInterestProfiles, setSentInterestProfiles] = useState<ProfileRow[]>([])
  const [receivedInterestProfiles, setReceivedInterestProfiles] = useState<ProfileRow[]>([])
  const [friendProfiles, setFriendProfiles] = useState<ProfileRow[]>([])
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([])
  const [makingFriendId, setMakingFriendId] = useState<string | null>(null)
  const [cancellingInterestId, setCancellingInterestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }
      setCurrentUserId(user.id)

      const { data: myProfile } = await supabase.from('profiles').select('user_id,nickname,region,relationship_purpose,avatar_url').eq('user_id', user.id).maybeSingle()
      setMe((myProfile as ProfileRow | null) ?? null)

      const [sentRes, receivedRes, friendshipsLowRes, friendshipsHighRes, conversationMembershipsRes, blocksRes] = await Promise.all([
        supabase.from('relationship_requests').select('target_user_id').eq('requester_user_id', user.id),
        supabase.from('relationship_requests').select('requester_user_id').eq('target_user_id', user.id),
        supabase.from('friendships').select('user_high_id').eq('user_low_id', user.id),
        supabase.from('friendships').select('user_low_id').eq('user_high_id', user.id),
        supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id),
        supabase.from('blocks').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`),
      ])

      const firstError = sentRes.error || receivedRes.error || friendshipsLowRes.error || friendshipsHighRes.error || conversationMembershipsRes.error || blocksRes.error
      if (firstError) { setError(firstError.message); setLoading(false); return }

      const blockedIdSet = new Set((blocksRes.data ?? []).map((row) => row.blocker_user_id === user.id ? row.blocked_user_id : row.blocker_user_id))
      const sentIds = (sentRes.data ?? []).map((row) => row.target_user_id as string)
      const receivedIds = (receivedRes.data ?? []).map((row) => row.requester_user_id as string)
      const friendIds = [...(friendshipsLowRes.data ?? []).map((row) => row.user_high_id as string), ...(friendshipsHighRes.data ?? []).map((row) => row.user_low_id as string)]

      const profileIds = Array.from(new Set([...sentIds, ...receivedIds, ...friendIds]))
      let profileMap = new Map<string, ProfileRow>()

      if (profileIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase.from('profiles').select('user_id,nickname,region,relationship_purpose,avatar_url').in('user_id', profileIds)
        if (profileError) { setError(profileError.message); setLoading(false); return }
        profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile]))
      }

      setSentInterestProfiles(sentIds.map((id) => profileMap.get(id)).filter((p) => p && !blockedIdSet.has(p.user_id)) as ProfileRow[])
      setReceivedInterestProfiles(receivedIds.map((id) => profileMap.get(id)).filter((p) => p && !blockedIdSet.has(p.user_id)) as ProfileRow[])
      setFriendProfiles(friendIds.map((id) => profileMap.get(id)).filter((p) => p && !blockedIdSet.has(p.user_id)) as ProfileRow[])

      const conversationIds = (conversationMembershipsRes.data ?? []).map((row) => row.conversation_id as string)
      if (conversationIds.length > 0) {
        const [membersRes, conversationsRes] = await Promise.all([
          supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', conversationIds),
          supabase.from('conversations').select('id,updated_at').in('id', conversationIds).order('updated_at', { ascending: false }),
        ])
        if (membersRes.error || conversationsRes.error) { setError(membersRes.error?.message || conversationsRes.error?.message || ''); setLoading(false); return }

        const otherUserIds = Array.from(new Set((membersRes.data ?? []).filter((m) => m.user_id !== user.id).map((m) => m.user_id as string)))
        const missingIds = otherUserIds.filter((id) => !profileMap.has(id))
        if (missingIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('user_id,nickname,region,relationship_purpose,avatar_url').in('user_id', missingIds)
          for (const profile of (profiles ?? []) as ProfileRow[]) profileMap.set(profile.user_id, profile)
        }

        const summaries = ((conversationsRes.data ?? []) as Array<{ id: string; updated_at: string }>).map((conversation) => {
          const otherMemberId = (membersRes.data ?? []).filter((m) => m.conversation_id === conversation.id).map((m) => m.user_id as string).find((id) => id !== user.id)
          return { id: conversation.id, otherProfile: otherMemberId ? profileMap.get(otherMemberId) ?? null : null, updatedAt: conversation.updated_at }
        })
        setConversationSummaries(summaries.filter((item) => !item.otherProfile || !blockedIdSet.has(item.otherProfile.user_id)))
      }
      setLoading(false)
    })()
  }, [supabase])

  async function makeFriend(targetUserId: string) {
    if (!currentUserId) return
    setMakingFriendId(targetUserId)
    const low = currentUserId < targetUserId ? currentUserId : targetUserId
    const high = currentUserId < targetUserId ? targetUserId : currentUserId
    const { error: insertError } = await supabase.from('friendships').insert({ user_low_id: low, user_high_id: high })
    if (insertError && !insertError.message.toLowerCase().includes('duplicate')) { setError(insertError.message); setMakingFriendId(null); return }
    const profile = receivedInterestProfiles.find((p) => p.user_id === targetUserId)
    setReceivedInterestProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId))
    if (profile) setFriendProfiles((prev) => [...prev, profile])
    setMakingFriendId(null)
  }

  async function cancelInterest(targetUserId: string) {
    if (!currentUserId) return
    if (typeof window !== 'undefined' && !window.confirm('이 관심을 취소하시겠어요?')) return
    setCancellingInterestId(targetUserId)
    const { error: deleteError } = await supabase.from('relationship_requests').delete().eq('requester_user_id', currentUserId).eq('target_user_id', targetUserId)
    if (deleteError) { setError(deleteError.message); setCancellingInterestId(null); return }
    setSentInterestProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId))
    setCancellingInterestId(null)
  }

  const totalConnections = useMemo(
    () => sentInterestProfiles.length + receivedInterestProfiles.length + friendProfiles.length + conversationSummaries.length,
    [conversationSummaries.length, friendProfiles.length, receivedInterestProfiles.length, sentInterestProfiles.length]
  )

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">관계 관리</h1>
          <p className="mt-2 text-muted-foreground font-medium">
            {me?.nickname ? `${me.nickname}님의` : '내'} 관심, 1촌, 대화를 한 화면에서 관리해요.
          </p>
        </header>

        <AppNav />

        {/* 요약 */}
        <section className="mt-6 bg-white rounded-4xl border border-border/50 shadow-sm p-5">
          <h2 className="text-lg font-bold text-foreground mb-3">현재 요약</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="보낸 관심" value={sentInterestProfiles.length} icon={<Heart size={16} />} />
            <StatCard label="받은 관심" value={receivedInterestProfiles.length} icon={<Heart size={16} className="fill-secondary text-secondary" />} />
            <StatCard label="1촌" value={friendProfiles.length} icon={<Users size={16} />} />
            <StatCard label="진행 중 대화" value={conversationSummaries.length} icon={<MessageSquare size={16} />} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">총 {totalConnections}개의 관계 연결 포인트</p>
        </section>

        <div className="mt-6 space-y-5">
          {/* 보낸 관심 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-5">
            <h2 className="text-xl font-bold text-foreground mb-4">내가 보낸 관심</h2>
            <div className="space-y-3">
              {sentInterestProfiles.map((profile) => (
                <ProfileRow key={profile.user_id} profile={profile}>
                  <Link href={`/people/${profile.user_id}`} className="text-sm font-bold text-primary hover:underline shrink-0">프로필</Link>
                  <button
                    type="button"
                    onClick={() => void cancelInterest(profile.user_id)}
                    disabled={cancellingInterestId === profile.user_id}
                    className="px-3 py-1.5 rounded-full border border-border/60 bg-white text-sm font-semibold hover:bg-muted/50 transition-colors disabled:opacity-60 shrink-0"
                  >
                    {cancellingInterestId === profile.user_id ? '취소 중...' : '관심 취소'}
                  </button>
                </ProfileRow>
              ))}
              {sentInterestProfiles.length === 0 && <EmptyState text="아직 보낸 관심이 없어요. 사람 목록에서 관심을 보내보세요." />}
            </div>
          </section>

          {/* 받은 관심 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-5">
            <h2 className="text-xl font-bold text-foreground mb-4">나에게 온 관심</h2>
            <div className="space-y-3">
              {receivedInterestProfiles.map((profile) => (
                <ProfileRow key={profile.user_id} profile={profile}>
                  <Link href={`/people/${profile.user_id}`} className="text-sm font-bold text-primary hover:underline shrink-0">프로필</Link>
                  <button
                    type="button"
                    onClick={() => void makeFriend(profile.user_id)}
                    disabled={makingFriendId === profile.user_id}
                    className="px-3 py-1.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
                  >
                    {makingFriendId === profile.user_id ? '처리 중...' : '1촌 맺기'}
                  </button>
                </ProfileRow>
              ))}
              {receivedInterestProfiles.length === 0 && <EmptyState text="아직 받은 관심이 없어요." />}
            </div>
          </section>

          {/* 1촌 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-5">
            <h2 className="text-xl font-bold text-foreground mb-4">1촌 목록</h2>
            <div className="space-y-3">
              {friendProfiles.map((profile) => (
                <ProfileRow key={profile.user_id} profile={profile}>
                  <Link href={`/people/${profile.user_id}`} className="text-sm font-bold text-primary hover:underline shrink-0">프로필 보기</Link>
                </ProfileRow>
              ))}
              {friendProfiles.length === 0 && <EmptyState text="아직 1촌이 없어요. 상호 관심이 생기면 1촌을 맺어보세요." />}
            </div>
          </section>

          {/* 대화 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">진행 중 대화</h2>
              <Link href="/messages" className="text-sm font-bold text-primary hover:underline">전체 보기</Link>
            </div>
            <div className="space-y-3">
              {conversationSummaries.map((item) => (
                <Link
                  key={item.id}
                  href={`/messages/${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors group"
                >
                  <Avatar avatarUrl={item.otherProfile?.avatar_url ?? null} nickname={item.otherProfile?.nickname ?? '?'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{item.otherProfile?.nickname ?? '알 수 없음'}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {[item.otherProfile?.region, item.otherProfile?.relationship_purpose].filter(Boolean).join(' · ') || '프로필 정보 없음'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    {item.updatedAt && formatDate(item.updatedAt)}
                    <ChevronRight size={16} />
                  </div>
                </Link>
              ))}
              {conversationSummaries.length === 0 && <EmptyState text="아직 진행 중인 대화가 없어요." />}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function ProfileRow({ profile, children }: { profile: ProfileRow; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30">
      <Avatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground">{profile.nickname}</div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
          <MapPin size={12} />
          <span className="truncate">{[profile.region, profile.relationship_purpose].filter(Boolean).join(' · ') || '정보 없음'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  )
}

function Avatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
  if (avatarUrl) return <img src={avatarUrl} alt={`${nickname} 프로필`} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" />
  return <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">{nickname.slice(0, 1)}</div>
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-muted/40 rounded-2xl p-3 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-sm font-semibold text-muted-foreground">{label}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-2">{text}</p>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}
