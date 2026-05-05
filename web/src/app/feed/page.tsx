export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedClient from './FeedClient'

type BlockedUserRow = {
  user_id: string
}

type PostVisibility = 'all' | 'friends' | 'same_group'

type PostRow = {
  id: number
  content: string
  visibility: PostVisibility
  image_url: string | null
  created_at: string
  user_id: string
  profiles: { nickname: string | null } | { nickname: string | null }[] | null
}

type ReactionRow = {
  post_id: number
}

function getNickname(profiles: PostRow['profiles']) {
  if (Array.isArray(profiles)) return profiles[0]?.nickname ?? '익명'
  return profiles?.nickname ?? '익명'
}

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: blockData } = await supabase.rpc('get_blocked_user_ids')
  const blockedIds = ((blockData ?? []) as BlockedUserRow[]).map((row) => row.user_id)

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
  const postRows = (posts ?? []) as unknown as PostRow[]

  const { data: myReactions } = await supabase
    .from('post_reactions')
    .select('post_id')
    .eq('user_id', auth.user.id)

  const likedSet = new Set(((myReactions ?? []) as ReactionRow[]).map((row) => row.post_id))

  const postIds = postRows.map((post) => post.id)
  const { data: reactionCounts } = await supabase
    .from('post_reactions')
    .select('post_id')
    .in('post_id', postIds.length > 0 ? postIds : [-1])

  const countMap: Record<number, number> = {}
  for (const row of (reactionCounts ?? []) as ReactionRow[]) {
    countMap[row.post_id] = (countMap[row.post_id] ?? 0) + 1
  }

  const enriched = postRows.map((post) => ({
    ...post,
    nickname: getNickname(post.profiles),
    likeCount: countMap[post.id] ?? 0,
    liked: likedSet.has(post.id),
  }))

  return <FeedClient initialPosts={enriched} userId={auth.user.id} />
}
