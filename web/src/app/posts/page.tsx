'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SafetyActions } from '@/components/safety-actions'

type PostRow = {
  id: number
  user_id: string
  image_url: string | null
  content: string | null
  visibility: Visibility
  created_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
  region: string | null
  avatar_url: string | null
  default_post_visibility?: Visibility | null
}

type ReactionRow = {
  post_id: number
  user_id: string
  reaction_type: string
}

type Visibility = 'private' | 'friends' | 'interested' | 'same_group' | 'members'

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string }> = [
  { value: 'private', label: '나만 보기' },
  { value: 'friends', label: '1촌만 보기' },
  { value: 'interested', label: '관심 있는 사람만 보기' },
  { value: 'same_group', label: '같은 모임 사람만 보기' },
  { value: 'members', label: '전체 인증회원 보기' },
]

const REACTIONS = ['따뜻해요', '응원해요', '반가워요'] as const

export default function PostsPage() {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [posts, setPosts] = useState<PostRow[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [interestIds, setInterestIds] = useState<Set<string>>(new Set())
  const [sharedGroupIds, setSharedGroupIds] = useState<Set<string>>(new Set())
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [imageUrl, setImageUrl] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('members')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

      const [
        postsRes,
        profilesRes,
        reactionsRes,
        sentInterestRes,
        receivedInterestRes,
        friendshipsLowRes,
        friendshipsHighRes,
        myMembershipsRes,
        allMembershipsRes,
        blocksRes,
      ] = await Promise.all([
        supabase
          .from('posts')
          .select('id,user_id,image_url,content,visibility,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id,nickname,region,avatar_url,default_post_visibility'),
        supabase.from('post_reactions').select('post_id,user_id,reaction_type'),
        supabase
          .from('relationship_requests')
          .select('target_user_id')
          .eq('requester_user_id', user.id),
        supabase
          .from('relationship_requests')
          .select('requester_user_id')
          .eq('target_user_id', user.id),
        supabase.from('friendships').select('user_high_id').eq('user_low_id', user.id),
        supabase.from('friendships').select('user_low_id').eq('user_high_id', user.id),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.from('group_members').select('group_id,user_id'),
        supabase
          .from('blocks')
          .select('blocker_user_id,blocked_user_id')
          .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`),
      ])

      const firstError =
        postsRes.error ||
        profilesRes.error ||
        reactionsRes.error ||
        sentInterestRes.error ||
        receivedInterestRes.error ||
        friendshipsLowRes.error ||
        friendshipsHighRes.error ||
        myMembershipsRes.error ||
        allMembershipsRes.error ||
        blocksRes.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      const profileMap = new Map(
        ((profilesRes.data ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile])
      )
      setProfiles(profileMap)
      setPosts((postsRes.data ?? []) as PostRow[])
      setReactions((reactionsRes.data ?? []) as ReactionRow[])
      setVisibility((profileMap.get(user.id)?.default_post_visibility ?? 'members') as Visibility)

      const friendIdSet = new Set<string>([
        ...((friendshipsLowRes.data ?? []).map((row) => row.user_high_id as string)),
        ...((friendshipsHighRes.data ?? []).map((row) => row.user_low_id as string)),
      ])
      setFriendIds(friendIdSet)

      const interestIdSet = new Set<string>([
        ...((sentInterestRes.data ?? []).map((row) => row.target_user_id as string)),
        ...((receivedInterestRes.data ?? []).map((row) => row.requester_user_id as string)),
        ...Array.from(friendIdSet),
      ])
      setInterestIds(interestIdSet)

      const myGroupIds = new Set((myMembershipsRes.data ?? []).map((row) => row.group_id as string))
      const sharedGroups = new Set<string>()
      for (const membership of allMembershipsRes.data ?? []) {
        if (membership.user_id !== user.id && myGroupIds.has(membership.group_id as string)) {
          sharedGroups.add(membership.user_id as string)
        }
      }
      setSharedGroupIds(sharedGroups)
      setBlockedIds(
        new Set(
          (blocksRes.data ?? []).map((row) =>
            row.blocker_user_id === user.id ? row.blocked_user_id : row.blocker_user_id
          )
        )
      )
      setLoading(false)
    })()
  }, [supabase])

  const visiblePosts = useMemo(() => {
    if (!currentUserId) return []

    return posts.filter((post) => {
      if (blockedIds.has(post.user_id)) return false
      if (post.user_id === currentUserId) return true
      if (post.visibility === 'members') return true
      if (post.visibility === 'friends') return friendIds.has(post.user_id)
      if (post.visibility === 'interested') return interestIds.has(post.user_id)
      if (post.visibility === 'same_group') return sharedGroupIds.has(post.user_id)
      return false
    })
  }, [blockedIds, currentUserId, friendIds, interestIds, posts, sharedGroupIds])

  async function createPost(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return

    if (!content.trim() && !imageUrl.trim()) {
      setError('사진 주소나 글 중 하나는 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: currentUserId,
        image_url: imageUrl.trim() || null,
        content: content.trim() || null,
        visibility,
      })
      .select('id,user_id,image_url,content,visibility,created_at')
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? '피드 등록에 실패했습니다.')
      setSubmitting(false)
      return
    }

    setPosts((prev) => [data as PostRow, ...prev])
    setImageUrl('')
    setContent('')
    setVisibility((profiles.get(currentUserId)?.default_post_visibility ?? 'members') as Visibility)
    setSubmitting(false)
  }

  async function toggleReaction(postId: number, reactionType: string) {
    if (!currentUserId) return
    setError(null)

    const existing = reactions.find(
      (reaction) =>
        reaction.post_id === postId &&
        reaction.user_id === currentUserId &&
        reaction.reaction_type === reactionType
    )

    if (existing) {
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .eq('reaction_type', reactionType)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      setReactions((prev) =>
        prev.filter(
          (reaction) =>
            !(
              reaction.post_id === postId &&
              reaction.user_id === currentUserId &&
              reaction.reaction_type === reactionType
            )
        )
      )
      return
    }

    const { error: insertError } = await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: currentUserId,
      reaction_type: reactionType,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setReactions((prev) => [...prev, { post_id: postId, user_id: currentUserId, reaction_type: reactionType }])
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error && posts.length === 0) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>생활 피드</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        사진과 짧은 글로 일상을 공유하고, 공개범위를 직접 조절해 보세요.
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
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>새 피드 작성</h2>
        <form onSubmit={createPost}>
          <label style={{ display: 'block', marginTop: 14 }}>사진 URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ width: '100%', padding: 12, fontSize: 16 }}
            placeholder="https://..."
          />

          <label style={{ display: 'block', marginTop: 14 }}>짧은 글</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', padding: 12, fontSize: 16, minHeight: 120 }}
            placeholder="오늘 있었던 일이나 취미 이야기를 남겨보세요."
          />

          <label style={{ display: 'block', marginTop: 14 }}>공개범위</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            style={{ width: '100%', padding: 12, fontSize: 16 }}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {error && <p style={{ marginTop: 10, color: 'crimson' }}>{error}</p>}

          <button disabled={submitting} style={{ marginTop: 16, padding: '12px 16px' }}>
            {submitting ? '등록 중...' : '피드 올리기'}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
        {visiblePosts.map((post) => {
          const author = profiles.get(post.user_id)
          const postReactions = reactions.filter((reaction) => reaction.post_id === post.id)
          return (
            <article
              key={post.id}
              style={{
                padding: 20,
                borderRadius: 20,
                border: '1px solid #e7e5e4',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <ProfileAvatar
                    avatarUrl={author?.avatar_url ?? null}
                    nickname={author?.nickname ?? '사용자'}
                  />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {author?.nickname ?? '알 수 없는 사용자'}
                    </div>
                    <div style={{ marginTop: 4, color: '#57534e' }}>
                      {[author?.region, visibilityLabel(post.visibility)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(post.created_at)}</div>
              </div>

              {post.image_url && (
                <div style={{ marginTop: 16 }}>
                  <Link href={post.image_url} target="_blank" style={{ textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt="생활 피드 이미지"
                      style={{
                        width: '100%',
                        maxHeight: 460,
                        objectFit: 'cover',
                        borderRadius: 18,
                        background: '#e7e5e4',
                      }}
                    />
                  </Link>
                </div>
              )}

              {post.content && (
                <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </p>
              )}

              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {REACTIONS.map((reactionType) => {
                  const count = postReactions.filter((reaction) => reaction.reaction_type === reactionType).length
                  const mine = postReactions.some(
                    (reaction) =>
                      reaction.user_id === currentUserId && reaction.reaction_type === reactionType
                  )
                  return (
                    <button
                      key={reactionType}
                      type="button"
                      onClick={() => toggleReaction(post.id, reactionType)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 999,
                        border: '1px solid #d6d3d1',
                        background: mine ? '#1c1917' : '#fafaf9',
                        color: mine ? '#fff' : '#1c1917',
                        fontWeight: 600,
                      }}
                    >
                      {reactionType} {count > 0 ? count : ''}
                    </button>
                  )
                })}
              </div>
              {currentUserId !== post.user_id && (
                <SafetyActions targetUserId={post.user_id} postId={post.id} compact />
              )}
            </article>
          )
        })}
        {visiblePosts.length === 0 && (
          <div style={{ padding: 24, borderRadius: 16, background: '#fafaf9', color: '#57534e' }}>
            아직 보이는 피드가 없어요. 첫 피드를 작성해 보세요.
          </div>
        )}
      </section>
    </div>
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

function visibilityLabel(visibility: Visibility) {
  return VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ?? visibility
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}
