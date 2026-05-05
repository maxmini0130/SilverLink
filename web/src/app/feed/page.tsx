export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  // 차단 관계 양방향 조회 (내가 차단한 + 나를 차단한)
  const { data: blockData } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${auth.user.id},blocked_id.eq.${auth.user.id}`)

  const blockedIds = (blockData ?? []).map((b: any) =>
    b.blocker_id === auth.user.id ? b.blocked_id : b.blocker_id
  )

  let postsQuery = supabase
    .from('posts')
    .select('id, content, visibility, image_url, created_at, user_id, profiles(nickname)')
    .eq('visibility', 'all')
    .order('created_at', { ascending: false })
    .limit(30)

  if (blockedIds.length > 0) {
    postsQuery = postsQuery.not('user_id', 'in', `(${blockedIds.join(',')})`)
  }

  const { data: posts } = await postsQuery

  const { data: myReactions } = await supabase
    .from('post_reactions')
    .select('post_id')
    .eq('user_id', auth.user.id)

  const likedSet = new Set((myReactions ?? []).map((r: any) => r.post_id))

  // 각 게시글의 좋아요 수
  const postIds = (posts ?? []).map((p: any) => p.id)
  const { data: reactionCounts } = await supabase
    .from('post_reactions')
    .select('post_id')
    .in('post_id', postIds.length > 0 ? postIds : [-1])

  const countMap: Record<number, number> = {}
  for (const r of reactionCounts ?? []) {
    countMap[(r as any).post_id] = (countMap[(r as any).post_id] ?? 0) + 1
  }

  const enriched = (posts ?? []).map((p: any) => ({
    ...p,
    nickname: p.profiles?.nickname ?? '익명',
    likeCount: countMap[p.id] ?? 0,
    liked: likedSet.has(p.id),
  }))

  return <FeedClient initialPosts={enriched} userId={auth.user.id} />
}
