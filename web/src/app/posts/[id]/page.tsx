'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SafetyActions } from '@/components/safety-actions'

type PostRow = {
  id: number
  user_id: string
  image_url: string | null
  content: string | null
  visibility: string
  created_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
  region: string | null
  avatar_url: string | null
}

type ReactionRow = {
  post_id: number
  user_id: string
  reaction_type: string
}

const REACTIONS = ['따뜻해요', '응원해요', '반가워요'] as const

const VISIBILITY_LABELS: Record<string, string> = {
  private: '나만 보기',
  friends: '1촌만 보기',
  interested: '관심 있는 사람만 보기',
  same_group: '같은 모임 사람만 보기',
  members: '전체 인증회원 보기',
}

export default function PostDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = useMemo(() => Number(params.id), [params.id])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [post, setPost] = useState<PostRow | null>(null)
  const [author, setAuthor] = useState<ProfileRow | null>(null)
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { router.replace('/login'); return }

      setCurrentUserId(user.id)

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('id,user_id,image_url,content,visibility,created_at')
        .eq('id', postId)
        .maybeSingle()

      if (postError || !postData) {
        setError(postError?.message ?? '피드를 찾을 수 없어요.')
        setLoading(false)
        return
      }

      const typedPost = postData as PostRow

      // 차단 관계 확인
      if (typedPost.user_id !== user.id) {
        const { data: block } = await supabase
          .from('blocks')
          .select('blocker_user_id')
          .or(
            `and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${typedPost.user_id}),` +
            `and(blocker_user_id.eq.${typedPost.user_id},blocked_user_id.eq.${user.id})`
          )
          .maybeSingle()

        if (block) {
          setError('이 피드를 볼 수 없습니다.')
          setLoading(false)
          return
        }
      }

      const [authorRes, reactionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id,nickname,region,avatar_url')
          .eq('user_id', typedPost.user_id)
          .maybeSingle(),
        supabase
          .from('post_reactions')
          .select('post_id,user_id,reaction_type')
          .eq('post_id', postId),
      ])

      setPost(typedPost)
      setAuthor((authorRes.data as ProfileRow | null) ?? null)
      setReactions((reactionsRes.data ?? []) as ReactionRow[])
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  async function toggleReaction(reactionType: string) {
    if (!currentUserId || !post) return

    const existing = reactions.find(
      (r) => r.post_id === post.id && r.user_id === currentUserId && r.reaction_type === reactionType
    )

    if (existing) {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .eq('reaction_type', reactionType)

      if (!error) {
        setReactions((prev) =>
          prev.filter(
            (r) => !(r.post_id === post.id && r.user_id === currentUserId && r.reaction_type === reactionType)
          )
        )
      }
    } else {
      const { error } = await supabase.from('post_reactions').insert({
        post_id: post.id,
        user_id: currentUserId,
        reaction_type: reactionType,
      })

      if (!error) {
        setReactions((prev) => [...prev, { post_id: post.id, user_id: currentUserId, reaction_type: reactionType }])
      }
    }
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>

  if (error || !post) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <Link href="/posts" style={{ textDecoration: 'underline', color: '#57534e' }}>
          ← 피드 목록
        </Link>
        <p style={{ marginTop: 16, color: 'crimson' }}>{error ?? '피드를 찾을 수 없어요.'}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Link href="/posts" style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 피드 목록
      </Link>
      <AppNav />

      <article
        style={{
          marginTop: 20,
          padding: 24,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        {/* 작성자 */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href={`/people/${post.user_id}`} style={{ textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'center' }}>
            <ProfileAvatar avatarUrl={author?.avatar_url ?? null} nickname={author?.nickname ?? '사용자'} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1c1917' }}>
                {author?.nickname ?? '알 수 없는 사용자'}
              </div>
              <div style={{ marginTop: 4, color: '#57534e' }}>
                {[author?.region, VISIBILITY_LABELS[post.visibility]].filter(Boolean).join(' · ')}
              </div>
            </div>
          </Link>
          <div style={{ marginLeft: 'auto', color: '#78716c', fontSize: 13 }}>
            {formatDate(post.created_at)}
          </div>
        </div>

        {/* 이미지 */}
        {post.image_url && (
          <div style={{ marginTop: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt="피드 이미지"
              style={{
                width: '100%',
                maxHeight: 560,
                objectFit: 'cover',
                borderRadius: 18,
                background: '#e7e5e4',
              }}
            />
          </div>
        )}

        {/* 본문 */}
        {post.content && (
          <p style={{ marginTop: 20, fontSize: 17, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#1c1917' }}>
            {post.content}
          </p>
        )}

        {/* 반응 버튼 */}
        <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {REACTIONS.map((reactionType) => {
            const count = reactions.filter((r) => r.reaction_type === reactionType).length
            const mine = reactions.some(
              (r) => r.user_id === currentUserId && r.reaction_type === reactionType
            )
            return (
              <button
                key={reactionType}
                type="button"
                onClick={() => toggleReaction(reactionType)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: '1px solid #d6d3d1',
                  background: mine ? '#1c1917' : '#fafaf9',
                  color: mine ? '#fff' : '#1c1917',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                {reactionType}{count > 0 ? ` ${count}` : ''}
              </button>
            )
          })}
        </div>

        {/* 신고/차단 (내 피드 아닐 때) */}
        {currentUserId && currentUserId !== post.user_id && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f5f5f4' }}>
            <SafetyActions targetUserId={post.user_id} postId={post.id} />
          </div>
        )}

        {/* 내 피드일 때 관리 링크 */}
        {currentUserId === post.user_id && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f5f5f4' }}>
            <Link href="/me" style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}>
              내 피드 관리 →
            </Link>
          </div>
        )}
      </article>
    </div>
  )
}

function ProfileAvatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
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
        fontSize: 22,
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
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
}
