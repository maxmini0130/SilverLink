export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MeClient from './MeClient'

export default async function MePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const uid = auth.user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, bio, avatar_url')
    .eq('user_id', uid)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  // 내 모임 목록
  const { data: myGroupMembers } = await supabase
    .from('group_members')
    .select('group_id, groups(id, title, category, region)')
    .eq('user_id', uid)

  const myGroups = (myGroupMembers ?? []).map((m: any) => m.groups).filter(Boolean)

  // 받은 관심 요청 (pending)
  const { data: pendingRequests } = await supabase
    .from('relationship_requests')
    .select('id, from_user_id, status, profiles!relationship_requests_from_user_id_fkey(nickname)')
    .eq('to_user_id', uid)
    .eq('status', 'pending')

  // 1촌 수
  const { count: friendCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .or(`user_id_a.eq.${uid},user_id_b.eq.${uid}`)

  // 차단 목록
  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey(nickname)')
    .eq('blocker_id', uid)

  return (
    <MeClient
      profile={profile as any}
      myGroups={myGroups as any}
      pendingRequests={(pendingRequests ?? []) as any}
      friendCount={friendCount ?? 0}
      blocks={(blocks ?? []) as any}
    />
  )
}
