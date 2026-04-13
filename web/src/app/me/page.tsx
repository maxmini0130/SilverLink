'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

type ProfileRow = {
  user_id: string
  nickname: string
  age_band: string | null
  region: string | null
  hobbies: string[] | null
  relationship_purpose: string | null
  bio: string | null
  avatar_url: string | null
}

type PostRow = {
  id: number
  image_url: string | null
  content: string | null
  visibility: string
  created_at: string
}

export default function MePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [sentInterestCount, setSentInterestCount] = useState(0)
  const [receivedInterestCount, setReceivedInterestCount] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [conversationCount, setConversationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingPostId, setWorkingPostId] = useState<number | null>(null)

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

      const [
        profileRes,
        postsRes,
        sentInterestRes,
        receivedInterestRes,
        friendshipsLowRes,
        friendshipsHighRes,
        conversationsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('posts')
          .select('id,image_url,content,visibility,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('relationship_requests')
          .select('target_user_id', { count: 'exact', head: true })
          .eq('requester_user_id', user.id),
        supabase
          .from('relationship_requests')
          .select('requester_user_id', { count: 'exact', head: true })
          .eq('target_user_id', user.id),
        supabase
          .from('friendships')
          .select('user_high_id', { count: 'exact', head: true })
          .eq('user_low_id', user.id),
        supabase
          .from('friendships')
          .select('user_low_id', { count: 'exact', head: true })
          .eq('user_high_id', user.id),
        supabase
          .from('conversation_members')
          .select('conversation_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      const firstError =
        profileRes.error ||
        postsRes.error ||
        sentInterestRes.error ||
        receivedInterestRes.error ||
        friendshipsLowRes.error ||
        friendshipsHighRes.error ||
        conversationsRes.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      setProfile((profileRes.data as ProfileRow | null) ?? null)
      setPosts((postsRes.data ?? []) as PostRow[])
      setSentInterestCount(sentInterestRes.count ?? 0)
      setReceivedInterestCount(receivedInterestRes.count ?? 0)
      setFriendCount((friendshipsLowRes.count ?? 0) + (friendshipsHighRes.count ?? 0))
      setConversationCount(conversationsRes.count ?? 0)
      setLoading(false)
    })()
  }, [supabase])

  const mostUsedVisibility = useMemo(() => {
    if (posts.length === 0) return '아직 없음'
    const counts = new Map<string, number>()
    for (const post of posts) {
      counts.set(post.visibility, (counts.get(post.visibility) ?? 0) + 1)
    }
    return visibilityLabel(
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'members'
    )
  }, [posts])

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>마이</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        내 프로필과 피드, 관계 현황을 한 곳에서 확인하세요.
      </p>
      <AppNav />

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <ProfileAvatar avatarUrl={profile?.avatar_url ?? null} nickname={profile?.nickname ?? '나'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{profile?.nickname ?? '프로필 준비 중'}</div>
            <div style={{ marginTop: 6, color: '#57534e' }}>
              {[profile?.age_band, profile?.region, profile?.relationship_purpose]
                .filter(Boolean)
                .join(' · ') || '기본 정보를 더 입력해 주세요.'}
            </div>
            {profile?.bio && (
              <p style={{ marginTop: 10, color: '#44403c', lineHeight: 1.6 }}>{profile.bio}</p>
            )}
          </div>
          <Link
            href="/onboarding?edit=1"
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid #d6d3d1',
              textDecoration: 'none',
              color: '#1c1917',
              fontWeight: 600,
            }}
          >
            프로필 수정
          </Link>
        </div>

        {!!profile?.hobbies?.length && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.hobbies.map((hobby) => (
              <span
                key={hobby}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: '#f5f5f4',
                }}
              >
                {hobby}
              </span>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#f5f5f4',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>내 활동 요약</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <SummaryCard label="내 피드" value={posts.length} />
          <SummaryCard label="보낸 관심" value={sentInterestCount} />
          <SummaryCard label="받은 관심" value={receivedInterestCount} />
          <SummaryCard label="1촌" value={friendCount} />
          <SummaryCard label="대화" value={conversationCount} />
        </div>
      </section>

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>내 생활 피드</h2>
            <p style={{ marginTop: 6, color: '#57534e' }}>
              가장 자주 쓰는 공개범위: {mostUsedVisibility}
            </p>
          </div>
          <Link href="/posts" style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}>
            피드 전체 보기
          </Link>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          {posts.map((post) => (
            <article
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 16,
                background: '#fafaf9',
                border: '1px solid #f0ede8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ color: '#57534e' }}>{visibilityLabel(post.visibility)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => editPost(post)}
                    disabled={workingPostId === post.id}
                    style={{ padding: '8px 10px' }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePost(post.id)}
                    disabled={workingPostId === post.id}
                    style={{ padding: '8px 10px' }}
                  >
                    삭제
                  </button>
                  <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(post.created_at)}</div>
                </div>
              </div>
              {post.image_url && (
                <div style={{ marginTop: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt="내 피드 이미지"
                    style={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 14,
                      background: '#e7e5e4',
                    }}
                  />
                </div>
              )}
              {post.content && (
                <p style={{ marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</p>
              )}
            </article>
          ))}
          {posts.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 작성한 피드가 없어요. 첫 생활 피드를 남겨보세요.</div>
          )}
        </div>
      </section>

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>다음 설정 영역</h2>
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <QuickLink
            title="관계 관리"
            description="보낸 관심, 받은 관심, 1촌, 진행 중 대화를 확인합니다."
            href="/relationships"
          />
          <QuickLink
            title="설정 / 고객센터"
            description="기본 공개범위, 차단 목록, 문의 안내를 관리합니다."
            href="/settings"
          />
          <QuickLink
            title="대화"
            description="조건을 만족한 개인 대화와 최근 메시지를 확인합니다."
            href="/messages"
          />
          <StaticCard title="차단 목록" description="설정 페이지에서 차단 해제와 상태 확인이 가능합니다." />
        </div>
      </section>
    </div>
  )

  async function editPost(post: PostRow) {
    const content = window.prompt('피드 내용을 수정해 주세요.', post.content ?? '')
    if (content === null) return
    const imageUrl = window.prompt('사진 URL을 수정해 주세요.', post.image_url ?? '')
    if (imageUrl === null) return
    const visibility = window.prompt(
      '공개범위를 입력해 주세요. private / friends / interested / same_group / members',
      post.visibility
    )
    if (visibility === null) return

    setWorkingPostId(post.id)
    setError(null)

    const response = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, imageUrl, visibility }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      setError(payload?.error ?? '피드 수정에 실패했습니다.')
      setWorkingPostId(null)
      return
    }

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, content: content || null, image_url: imageUrl || null, visibility: visibility || 'members' }
          : item
      )
    )
    setWorkingPostId(null)
  }

  async function deletePost(postId: number) {
    if (!window.confirm('이 피드를 삭제할까요?')) return

    setWorkingPostId(postId)
    setError(null)

    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      setError(payload?.error ?? '피드 삭제에 실패했습니다.')
      setWorkingPostId(null)
      return
    }

    setPosts((prev) => prev.filter((item) => item.id !== postId))
    setWorkingPostId(null)
  }
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
      <div style={{ fontSize: 14, color: '#57534e' }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: 16,
        borderRadius: 16,
        textDecoration: 'none',
        color: '#1c1917',
        background: '#fafaf9',
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 6, color: '#57534e' }}>{description}</div>
    </Link>
  )
}

function StaticCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: '#fafaf9',
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 6, color: '#57534e' }}>{description}</div>
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
        style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', background: '#e7e5e4' }}
      />
    )
  }

  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        color: '#1c1917',
        fontSize: 32,
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
  )
}

function visibilityLabel(value: string) {
  if (value === 'private') return '나만 보기'
  if (value === 'friends') return '1촌만 보기'
  if (value === 'interested') return '관심 있는 사람만 보기'
  if (value === 'same_group') return '같은 모임 사람만 보기'
  return '전체 인증회원 보기'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}
