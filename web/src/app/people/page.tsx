export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PeopleClient from './PeopleClient'

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('region, hobbies')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!myProfile) redirect('/onboarding')

  // 다른 유저 목록 (같은 지역 or 공통 취미 우선)
  const { data: people } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, bio')
    .neq('user_id', auth.user.id)
    .limit(50)

  // 내가 보낸 관심 목록
  const { data: sentRequests } = await supabase
    .from('relationship_requests')
    .select('to_user_id, status')
    .eq('from_user_id', auth.user.id)

  // 1촌 목록
  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id_a, user_id_b')
    .or(`user_id_a.eq.${auth.user.id},user_id_b.eq.${auth.user.id}`)

  const friendSet = new Set<string>()
  for (const f of friendships ?? []) {
    friendSet.add(f.user_id_a === auth.user.id ? f.user_id_b : f.user_id_a)
  }

  const requestMap: Record<string, string> = {}
  for (const r of sentRequests ?? []) {
    requestMap[r.to_user_id] = r.status
  }

  // 공통 취미 수 계산 후 정렬
  const enriched = (people ?? []).map((p: any) => {
    const commonHobbies = (p.hobbies ?? []).filter((h: string) => (myProfile.hobbies ?? []).includes(h))
    return {
      ...p,
      commonHobbies,
      sameRegion: p.region === myProfile.region,
      requestStatus: requestMap[p.user_id] ?? null,
      isFriend: friendSet.has(p.user_id),
    }
  }).sort((a: any, b: any) => {
    const scoreA = (a.sameRegion ? 10 : 0) + a.commonHobbies.length
    const scoreB = (b.sameRegion ? 10 : 0) + b.commonHobbies.length
    return scoreB - scoreA
  })

  return <PeopleClient people={enriched} myId={auth.user.id} />
}
