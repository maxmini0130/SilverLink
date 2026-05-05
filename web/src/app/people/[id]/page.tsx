export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileDetailClient from './ProfileDetailClient'

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  if (targetId === auth.user.id) redirect('/me')

  const { data: iBlocked } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', auth.user.id)
    .eq('blocked_id', targetId)
    .maybeSingle()

  if (iBlocked) redirect('/people')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, bio, avatar_url')
    .eq('user_id', targetId)
    .maybeSingle()

  if (!profile) notFound()

  const { data: sentRequest } = await supabase
    .from('relationship_requests')
    .select('status')
    .eq('from_user_id', auth.user.id)
    .eq('to_user_id', targetId)
    .maybeSingle()

  const { data: receivedRequest } = await supabase
    .from('relationship_requests')
    .select('id, status')
    .eq('from_user_id', targetId)
    .eq('to_user_id', auth.user.id)
    .maybeSingle()

  const a = auth.user.id < targetId ? auth.user.id : targetId
  const b = auth.user.id < targetId ? targetId : auth.user.id
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id_a', a)
    .eq('user_id_b', b)
    .maybeSingle()

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
