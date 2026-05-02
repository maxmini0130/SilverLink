export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileDetailClient from './ProfileDetailClient'

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  // 본인이면 마이페이지로
  if (targetId === auth.user.id) redirect('/me')

  // 내가 차단한 사용자면 사람 목록으로
  const { data: iBlocked } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', auth.user.id)
    .eq('blocked_id', targetId)
    .maybeSingle()

  if (iBlocked) redirect('/people')

  // 상대 프로필
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, bio, avatar_url')
    .eq('user_id', targetId)
    .maybeSingle()

  if (!profile) notFound()

  // 내가 보낸 관심 요청
  const { data: sentRequest } = await supabase
    .from('relationship_requests')
    .select('status')
    .eq('from_user_id', auth.user.id)
    .eq('to_user_id', targetId)
    .maybeSingle()

  // 상대가 나에게 보낸 관심 요청
  const { data: receivedRequest } = await supabase
    .from('relationship_requests')
    .select('id, status')
    .eq('from_user_id', targetId)
    .eq('to_user_id', auth.user.id)
    .maybeSingle()

  // 1촌 여부 (user_id_a < user_id_b 제약)
  const a = auth.user.id < targetId ? auth.user.id : targetId
  const b = auth.user.id < targetId ? targetId : auth.user.id
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id_a', a)
    .eq('user_id_b', b)
    .maybeSingle()

  // 상대방 최근 공개 글 3개
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, created_at')
    .eq('user_id', targetId)
    .eq('visibility', 'all')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <ProfileDetailClient
      profile={profile}
      myId={auth.user.id}
      isFriend={!!friendship}
      sentStatus={sentRequest?.status ?? null}
      receivedRequest={receivedRequest ? { id: receivedRequest.id } : null}
      recentPosts={posts ?? []}
    />
  )
}
