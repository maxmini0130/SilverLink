export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PeopleClient, { type Person } from './PeopleClient'

type MyProfileRow = {
  region: string
  hobbies: string[] | null
}

type PersonRow = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[] | null
  bio: string | null
  avatar_url?: string | null
}

type RelationshipRequestRow = {
  to_user_id: string
  status: string | null
}

type FriendshipRow = {
  user_id_a: string
  user_id_b: string
}

function scorePerson(person: Person) {
  return (person.sameRegion ? 10 : 0) + person.commonHobbies.length
}

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

  const myProfileRow = myProfile as MyProfileRow

  const { data: people } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, bio, avatar_url')
    .neq('user_id', auth.user.id)
    .limit(50)

  const { data: sentRequests } = await supabase
    .from('relationship_requests')
    .select('to_user_id, status')
    .eq('from_user_id', auth.user.id)

  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id_a, user_id_b')
    .or(`user_id_a.eq.${auth.user.id},user_id_b.eq.${auth.user.id}`)

  const friendSet = new Set<string>()
  for (const friendship of (friendships ?? []) as FriendshipRow[]) {
    friendSet.add(friendship.user_id_a === auth.user.id ? friendship.user_id_b : friendship.user_id_a)
  }

  const requestMap: Record<string, string> = {}
  for (const request of (sentRequests ?? []) as RelationshipRequestRow[]) {
    requestMap[request.to_user_id] = request.status ?? ''
  }

  const enriched: Person[] = ((people ?? []) as PersonRow[])
    .map((person) => {
      const hobbies = person.hobbies ?? []
      const commonHobbies = hobbies.filter((hobby) => (myProfileRow.hobbies ?? []).includes(hobby))
      return {
        user_id: person.user_id,
        nickname: person.nickname,
        age_band: person.age_band,
        region: person.region,
        hobbies,
        bio: person.bio ?? '',
        avatar_url: person.avatar_url ?? null,
        commonHobbies,
        sameRegion: person.region === myProfileRow.region,
        requestStatus: requestMap[person.user_id] || null,
        isFriend: friendSet.has(person.user_id),
      }
    })
    .sort((a, b) => scorePerson(b) - scorePerson(a))

  return <PeopleClient people={enriched} myId={auth.user.id} />
}
