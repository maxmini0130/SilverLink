'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SafetyActions } from '@/components/safety-actions'
import { ChevronLeft, MapPin, Clock, Globe } from 'lucide-react'
import { visibilityLabel } from '@/lib/visibility'

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

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-border/50 max-w-md w-full text-center">
          <p className="text-red-500 font-bold mb-6">{error ?? '피드를 찾을 수 없어요.'}</p>
          <Link href="/posts" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
            <ChevronLeft size={20} />
            피드 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto">
        {/* 상단 헤더 */}
        <div className="px-5 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <Link href="/posts" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-border/50 text-foreground">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="font-bold text-lg">피드 상세</h2>
          <div className="w-10" />
        </div>

        <AppNav />

        <div className="px-5 mt-4">
          <article className="bg-white rounded-[32px] border border-border/50 shadow-sm overflow-hidden">
            {/* 작성자 정보 */}
            <div className="p-6 pb-4">
              <Link href={`/people/${post.user_id}`} className="flex items-center gap-3 group">
                {author?.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={`${author.nickname} 프로필 사진`}
                    className="w-14 h-14 rounded-full object-cover bg-muted"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                    {(author?.nickname ?? '?').slice(0, 1)}
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {author?.nickname ?? '알 수 없는 사용자'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                    {author?.region && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {author.region}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      {visibilityLabel(post.visibility)}
                    </span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {formatDate(post.created_at)}
                </div>
              </Link>
            </div>

            {/* 이미지 */}
            {post.image_url && (
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={post.image_url}
                  alt="피드 이미지"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 본문 */}
            <div className="p-6">
              {post.content && (
                <p className="text-foreground leading-relaxed whitespace-pre-wrap text-[17px]">
                  {post.content}
                </p>
              )}

              {/* 반응 버튼 */}
              <div className="mt-6 flex flex-wrap gap-2">
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
                      className={`px-5 py-2.5 rounded-full font-semibold text-[15px] border transition-all ${
                        mine
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-foreground border-border/60 hover:border-primary/40'
                      }`}
                    >
                      {reactionType}{count > 0 ? ` ${count}` : ''}
                    </button>
                  )
                })}
              </div>

              {/* 신고/차단 */}
              {currentUserId && currentUserId !== post.user_id && (
                <div className="mt-6 pt-5 border-t border-border/40">
                  <SafetyActions targetUserId={post.user_id} postId={post.id} />
                </div>
              )}

              {/* 내 피드 관리 링크 */}
              {currentUserId === post.user_id && (
                <div className="mt-6 pt-5 border-t border-border/40">
                  <Link href="/me" className="text-primary font-bold hover:underline">
                    내 피드 관리 →
                  </Link>
                </div>
              )}
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
}
