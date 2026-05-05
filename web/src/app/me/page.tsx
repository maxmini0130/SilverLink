export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MeClient, { type Block, type Group, type PendingRequest, type Profile } from './MeClient'

type ProfileRef = {
  nickname: string | null
}

type GroupMemberRow = {
  groups: Group | Group[] | null
}

type PendingRequestRow = {
  id: number
  from_user_id: string
  profiles: ProfileRef | ProfileRef[] | null
}

type BlockRow = {
  blocked_id: string
  profiles: ProfileRef | ProfileRef[] | null
}

function firstProfile(profile: ProfileRef | ProfileRef[] | null) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile
}

function firstGroup(group: Group | Group[] | null) {
  if (Array.isArray(group)) return group[0] ?? null
  return group
}

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

  const { data: myGroupMembers } = await supabase
    .from('group_members')
    .select('group_id, groups(id, title, category, region)')
    .eq('user_id', uid)

  const myGroups: Group[] = ((myGroupMembers ?? []) as unknown as GroupMemberRow[])
    .map((member) => firstGroup(member.groups))
    .filter((group): group is Group => Boolean(group))

  const { data: pendingRequests } = await supabase
    .from('relationship_requests')
    .select('id, from_user_id, status, profiles!relationship_requests_from_user_id_fkey(nickname)')
    .eq('to_user_id', uid)
    .eq('status', 'pending')

  const { count: friendCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .or(`user_id_a.eq.${uid},user_id_b.eq.${uid}`)

  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey(nickname)')
    .eq('blocker_id', uid)

  const normalizedRequests: PendingRequest[] = ((pendingRequests ?? []) as unknown as PendingRequestRow[])
    .map((request) => ({
      id: request.id,
      from_user_id: request.from_user_id,
      profiles: { nickname: firstProfile(request.profiles)?.nickname ?? '이름 없음' },
    }))

  const normalizedBlocks: Block[] = ((blocks ?? []) as unknown as BlockRow[])
    .map((block) => ({
      blocked_id: block.blocked_id,
      profiles: { nickname: firstProfile(block.profiles)?.nickname ?? '이름 없음' },
    }))

  return (
    <MeClient
      profile={profile as unknown as Profile}
      myGroups={myGroups}
      pendingRequests={normalizedRequests}
      friendCount={friendCount ?? 0}
      blocks={normalizedBlocks}
    />
  )
}
