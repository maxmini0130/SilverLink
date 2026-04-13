'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import UserAvatar from '@/components/common/UserAvatar'
import { REACTION_META, type ReactionType } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────

type ReactionRow = {
  reaction_type: ReactionType
  user_id: string
}

type PostRow = {
  id: string
  content: string
  image_url: string
  created_at: string
  author_id: string
  profiles: {
    nickname: string
    avatar_url: string | null
    region_district: string
  } | null
  post_reactions: ReactionRow[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)   return '방금 전'
  if (minutes < 60)  return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

// ─────────────────────────────────────────────────────
// 피드 페이지
// ─────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter()
  const supabase = createClient()

  const [posts, setPosts] = useState<PostRow[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      setMyUserId(auth.user?.id ?? null)

      const { data, error: qerr } = await supabase
        .from('posts')
        .select(
          `id, content, image_url, created_at, author_id,
           profiles!author_id(nickname, avatar_url, region_district),
           post_reactions(reaction_type, user_id)`,
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30)

      if (qerr) setError(qerr.message)
      setPosts((data ?? []) as unknown as PostRow[])
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleReaction(postId: string, reactionType: ReactionType) {
    if (!myUserId) return

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const existing = post.post_reactions.find(
      (r) => r.reaction_type === reactionType && r.user_id === myUserId,
    )

    if (existing) {
      // 반응 취소
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', myUserId)
        .eq('reaction_type', reactionType)

      setPosts((prev) =>
        prev.map((p) =>
          p.id !== postId
            ? p
            : {
                ...p,
                post_reactions: p.post_reactions.filter(
                  (r) => !(r.reaction_type === reactionType && r.user_id === myUserId),
                ),
              },
        ),
      )
    } else {
      // 반응 추가
      await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: myUserId,
        reaction_type: reactionType,
      })

      setPosts((prev) =>
        prev.map((p) =>
          p.id !== postId
            ? p
            : {
                ...p,
                post_reactions: [
                  ...p.post_reactions,
                  { reaction_type: reactionType, user_id: myUserId },
                ],
              },
        ),
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">생활 피드</h1>
        <Button
          size="sm"
          onClick={() => router.push('/feed/new')}
          aria-label="새 글 작성"
        >
          <Plus size={18} className="mr-1" />
          글쓰기
        </Button>
      </header>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-3 pt-3 pb-4">
        {posts.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
            <span className="text-5xl">🌸</span>
            <p className="text-base text-gray-500">아직 올라온 피드가 없어요.</p>
            <p className="text-sm text-gray-400">첫 번째 글을 작성해보세요!</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => router.push('/feed/new')}
            >
              글쓰기
            </Button>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            myUserId={myUserId}
            onToggleReaction={toggleReaction}
          />
        ))}
      </div>
    </div>
  )
}

// ─── 개별 피드 카드 ──────────────────────────────────

function PostCard({
  post,
  myUserId,
  onToggleReaction,
}: {
  post: PostRow
  myUserId: string | null
  onToggleReaction: (postId: string, type: ReactionType) => void
}) {
  return (
    <Card className="overflow-hidden">
      {/* 작성자 */}
      <CardContent className="flex items-center gap-3 pt-4 pb-3">
        <UserAvatar
          nickname={post.profiles?.nickname ?? '?'}
          avatarUrl={post.profiles?.avatar_url ?? null}
          size="md"
        />
        <div>
          <p className="text-base font-bold text-gray-900">
            {post.profiles?.nickname ?? '알 수 없음'}
          </p>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            {post.profiles?.region_district && (
              <>
                <MapPin size={11} />
                <span>{post.profiles.region_district}</span>
                <span className="text-gray-300">·</span>
              </>
            )}
            {timeAgo(post.created_at)}
          </p>
        </div>
      </CardContent>

      {/* 사진 */}
      <div className="w-full aspect-square bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_url}
          alt="피드 사진"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 본문 */}
      <CardContent className="pt-3 pb-2">
        <p className="text-base text-gray-800 leading-relaxed">{post.content}</p>
      </CardContent>

      {/* 반응 버튼 */}
      <div className="flex border-t border-gray-100">
        {REACTION_META.map(({ type, emoji, label }) => {
          const count = post.post_reactions.filter((r) => r.reaction_type === type).length
          const reacted = post.post_reactions.some(
            (r) => r.reaction_type === type && r.user_id === myUserId,
          )
          return (
            <button
              key={type}
              onClick={() => onToggleReaction(post.id, type)}
              className={[
                'flex-1 flex flex-col items-center justify-center py-3 gap-0.5',
                'hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[52px]',
                reacted ? 'bg-blue-50' : '',
              ].join(' ')}
              aria-label={label}
            >
              <span className="text-lg leading-none">{emoji}</span>
              <span
                className={[
                  'text-xs tabular-nums',
                  reacted ? 'text-blue-500 font-semibold' : 'text-gray-400',
                ].join(' ')}
              >
                {count > 0 ? count : ''}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
