export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, visibility, image_url, created_at, user_id, profiles(nickname)')
    .eq('visibility', 'all')
    .order('created_at', { ascending: false })
    .limit(30)

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
