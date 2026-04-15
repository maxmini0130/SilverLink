'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

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
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('user_id,nickname,region,relationship_purpose,avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      setMe((myProfile as ProfileRow | null) ?? null)

      const [
        sentRes,
        receivedRes,
        friendshipsLowRes,
        friendshipsHighRes,
        conversationMembershipsRes,
        blocksRes,
      ] = await Promise.all([
        supabase
          .from('relationship_requests')
          .select('target_user_id')
          .eq('requester_user_id', user.id),
        supabase
          .from('relationship_requests')
          .select('requester_user_id')
          .eq('target_user_id', user.id),
        supabase
          .from('friendships')
          .select('user_high_id')
          .eq('user_low_id', user.id),
        supabase
          .from('friendships')
          .select('user_low_id')
          .eq('user_high_id', user.id),
        supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', user.id),
        supabase
          .from('blocks')
          .select('blocker_user_id,blocked_user_id')
          .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`),
      ])

      const firstError =
        sentRes.error ||
        receivedRes.error ||
        friendshipsLowRes.error ||
        friendshipsHighRes.error ||
        conversationMembershipsRes.error ||
        blocksRes.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      const blockedIdSet = new Set(
        (blocksRes.data ?? []).map((row) =>
          row.blocker_user_id === user.id ? row.blocked_user_id : row.blocker_user_id
        )
      )
      const sentIds = (sentRes.data ?? []).map((row) => row.target_user_id as string)
      const receivedIds = (receivedRes.data ?? []).map((row) => row.requester_user_id as string)
      const friendIds = [
        ...(friendshipsLowRes.data ?? []).map((row) => row.user_high_id as string),
        ...(friendshipsHighRes.data ?? []).map((row) => row.user_low_id as string),
      ]

      const profileIds = Array.from(new Set([...sentIds, ...receivedIds, ...friendIds]))
      let profileMap = new Map<string, ProfileRow>()

      if (profileIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id,nickname,region,relationship_purpose,avatar_url')
          .in('user_id', profileIds)

        if (profileError) {
          setError(profileError.message)
          setLoading(false)
          return
        }

        profileMap = new Map(
          ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile])
        )
      }

      setSentInterestProfiles(
        sentIds.map((id) => profileMap.get(id)).filter((profile) => profile && !blockedIdSet.has(profile.user_id)) as ProfileRow[]
      )
      setReceivedInterestProfiles(
        receivedIds.map((id) => profileMap.get(id)).filter((profile) => profile && !blockedIdSet.has(profile.user_id)) as ProfileRow[]
      )
      setFriendProfiles(
        friendIds.map((id) => profileMap.get(id)).filter((profile) => profile && !blockedIdSet.has(profile.user_id)) as ProfileRow[]
      )

      const conversationIds = (conversationMembershipsRes.data ?? []).map(
        (row) => row.conversation_id as string
      )

      if (conversationIds.length > 0) {
        const [membersRes, conversationsRes] = await Promise.all([
          supabase
            .from('conversation_members')
            .select('conversation_id,user_id')
            .in('conversation_id', conversationIds),
          supabase
            .from('conversations')
            .select('id,updated_at')
            .in('id', conversationIds)
            .order('updated_at', { ascending: false }),
        ])

        if (membersRes.error || conversationsRes.error) {
          setError(membersRes.error?.message || conversationsRes.error?.message || '대화 정보를 불러오지 못했습니다.')
          setLoading(false)
          return
        }

        const otherUserIds = Array.from(
          new Set(
            (membersRes.data ?? [])
              .filter((member) => member.user_id !== user.id)
              .map((member) => member.user_id as string)
          )
        )

        if (otherUserIds.length > 0) {
          const missingIds = otherUserIds.filter((id) => !profileMap.has(id))
          if (missingIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('user_id,nickname,region,relationship_purpose,avatar_url')
              .in('user_id', missingIds)

            if (profileError) {
              setError(profileError.message)
              setLoading(false)
              return
            }

            for (const profile of (profiles ?? []) as ProfileRow[]) {
              profileMap.set(profile.user_id, profile)
            }
          }
        }

        const summaries = ((conversationsRes.data ?? []) as Array<{ id: string; updated_at: string }>).map(
          (conversation) => {
            const otherMemberId = (membersRes.data ?? [])
              .filter((member) => member.conversation_id === conversation.id)
              .map((member) => member.user_id as string)
              .find((id) => id !== user.id)

            return {
              id: conversation.id,
              otherProfile: otherMemberId ? profileMap.get(otherMemberId) ?? null : null,
              updatedAt: conversation.updated_at,
            }
          }
        )

        setConversationSummaries(
          summaries.filter((item) => !item.otherProfile || !blockedIdSet.has(item.otherProfile.user_id))
        )
      }

      setLoading(false)
    })()
  }, [supabase])

  async function makeFriend(targetUserId: string) {
    if (!currentUserId) return
    setMakingFriendId(targetUserId)
    setError(null)

    const low = currentUserId < targetUserId ? currentUserId : targetUserId
    const high = currentUserId < targetUserId ? targetUserId : currentUserId

    const { error: insertError } = await supabase.from('friendships').insert({
      user_low_id: low,
      user_high_id: high,
    })

    if (insertError && !insertError.message.toLowerCase().includes('duplicate')) {
      setError(insertError.message)
      setMakingFriendId(null)
      return
    }

    // 받은 관심 목록에서 제거하고 1촌 목록에 추가
    const profile = receivedInterestProfiles.find((p) => p.user_id === targetUserId)
    setReceivedInterestProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId))
    if (profile) setFriendProfiles((prev) => [...prev, profile])
    setMakingFriendId(null)
  }

  async function cancelInterest(targetUserId: string) {
    if (!currentUserId) return
    if (typeof window !== 'undefined' && !window.confirm('이 관심을 취소하시겠어요?')) return

    setCancellingInterestId(targetUserId)
    setError(null)

    const { error: deleteError } = await supabase
      .from('relationship_requests')
      .delete()
      .eq('requester_user_id', currentUserId)
      .eq('target_user_id', targetUserId)

    if (deleteError) {
      setError(deleteError.message)
      setCancellingInterestId(null)
      return
    }

    setSentInterestProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId))
    setCancellingInterestId(null)
  }

  const totalConnections = useMemo(
    () =>
      sentInterestProfiles.length +
      receivedInterestProfiles.length +
      friendProfiles.length +
      conversationSummaries.length,
    [conversationSummaries.length, friendProfiles.length, receivedInterestProfiles.length, sentInterestProfiles.length]
  )

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>관계 관리</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        {me?.nickname ? `${me.nickname}님의` : '내'} 관심, 1촌, 대화를 한 화면에서 관리할 수 있어요.
      </p>
      <AppNav />

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          background: '#f5f5f4',
          border: '1px solid #e7e5e4',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>현재 요약</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <SummaryCard label="내가 보낸 관심" value={sentInterestProfiles.length} />
          <SummaryCard label="나에게 온 관심" value={receivedInterestProfiles.length} />
          <SummaryCard label="1촌" value={friendProfiles.length} />
          <SummaryCard label="진행 중 대화" value={conversationSummaries.length} />
        </div>
        <p style={{ marginTop: 12, color: '#78716c', fontSize: 14 }}>
          총 {totalConnections}개의 관계 연결 포인트가 있습니다.
        </p>
      </section>

      <div style={{ marginTop: 20, display: 'grid', gap: 18 }}>
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border: '1px solid #e7e5e4',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>내가 보낸 관심</h2>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {sentInterestProfiles.map((profile) => (
              <div
                key={profile.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: '#fafaf9',
                }}
              >
                <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{profile.nickname}</div>
                  <div style={{ marginTop: 4, color: '#57534e' }}>
                    {[profile.region, profile.relationship_purpose].filter(Boolean).join(' · ') || '프로필 정보 준비 중'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link
                    href={`/people/${profile.user_id}`}
                    style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}
                  >
                    프로필 보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => void cancelInterest(profile.user_id)}
                    disabled={cancellingInterestId === profile.user_id}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid #d6d3d1',
                      background: '#fff',
                      color: '#1c1917',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {cancellingInterestId === profile.user_id ? '취소 중...' : '관심 취소'}
                  </button>
                </div>
              </div>
            ))}
            {sentInterestProfiles.length === 0 && (
              <div style={{ color: '#57534e' }}>
                아직 보낸 관심이 없어요. 사람 목록에서 먼저 관심을 보내보세요.
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border: '1px solid #e7e5e4',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>나에게 온 관심</h2>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {receivedInterestProfiles.map((profile) => (
              <div
                key={profile.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: '#fafaf9',
                }}
              >
                <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{profile.nickname}</div>
                  <div style={{ marginTop: 4, color: '#57534e' }}>
                    {[profile.region, profile.relationship_purpose].filter(Boolean).join(' · ') || '프로필 정보 준비 중'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    href={`/people/${profile.user_id}`}
                    style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}
                  >
                    프로필 보기
                  </Link>
                  <button
                    type="button"
                    onClick={() => void makeFriend(profile.user_id)}
                    disabled={makingFriendId === profile.user_id}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: 'none',
                      background: '#1c1917',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {makingFriendId === profile.user_id ? '처리 중...' : '1촌 맺기'}
                  </button>
                </div>
              </div>
            ))}
            {receivedInterestProfiles.length === 0 && (
              <div style={{ color: '#57534e' }}>아직 받은 관심이 없어요.</div>
            )}
          </div>
        </section>

        <RelationshipSection
          title="1촌 목록"
          emptyText="아직 1촌이 없어요. 상호 관심이 생기거나 같은 모임에서 연결해 보세요."
          items={friendProfiles}
          actionLabel="대화 보기"
          actionHref={(profile) => `/people/${profile.user_id}`}
        />

        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border: '1px solid #e7e5e4',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>진행 중 대화</h2>
              <p style={{ marginTop: 6, color: '#57534e' }}>
                조건을 만족해 시작된 개인 대화입니다.
              </p>
            </div>
            <Link href="/messages" style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}>
              전체 대화 보기
            </Link>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {conversationSummaries.map((item) => (
              <Link
                key={item.id}
                href={`/messages/${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: '#1c1917',
                  background: '#fafaf9',
                }}
              >
                <ProfileAvatar
                  avatarUrl={item.otherProfile?.avatar_url ?? null}
                  nickname={item.otherProfile?.nickname ?? '대화 상대'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{item.otherProfile?.nickname ?? '알 수 없는 사용자'}</div>
                  <div style={{ marginTop: 4, color: '#57534e' }}>
                    {[item.otherProfile?.region, item.otherProfile?.relationship_purpose]
                      .filter(Boolean)
                      .join(' · ') || '프로필 정보 준비 중'}
                  </div>
                </div>
                <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(item.updatedAt)}</div>
              </Link>
            ))}
            {conversationSummaries.length === 0 && (
              <div style={{ color: '#57534e' }}>아직 진행 중인 개인 대화가 없어요.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: '#fff',
        border: '1px solid #e7e5e4',
      }}
    >
      <div style={{ color: '#57534e', fontSize: 14 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function RelationshipSection({
  title,
  emptyText,
  items,
  actionLabel,
  actionHref,
}: {
  title: string
  emptyText: string
  items: ProfileRow[]
  actionLabel: string
  actionHref: (profile: ProfileRow) => string
}) {
  return (
    <section
      style={{
        padding: 20,
        borderRadius: 18,
        border: '1px solid #e7e5e4',
        background: '#fff',
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h2>
      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {items.map((profile) => (
          <div
            key={profile.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              borderRadius: 14,
              background: '#fafaf9',
            }}
          >
            <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{profile.nickname}</div>
              <div style={{ marginTop: 4, color: '#57534e' }}>
                {[profile.region, profile.relationship_purpose].filter(Boolean).join(' · ') || '프로필 정보 준비 중'}
              </div>
            </div>
            <Link
              href={actionHref(profile)}
              style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}
            >
              {actionLabel}
            </Link>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#57534e' }}>{emptyText}</div>}
      </div>
    </section>
  )
}

function ProfileAvatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null
  nickname: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', background: '#e7e5e4' }}
      />
    )
  }

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        color: '#1c1917',
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}
