'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { RelationshipActions } from '@/components/relationship-actions'
import { MapPin, SlidersHorizontal, Users } from 'lucide-react'

type ProfileRow = {
  user_id: string
  nickname: string
  age_band: string | null
  region: string | null
  hobbies: string[] | null
  relationship_purpose: string | null
  bio: string | null
  avatar_url: string | null
}

export default function PeoplePage() {
  const supabase = createClient()
  const [me, setMe] = useState<ProfileRow | null>(null)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [regionFilter, setRegionFilter] = useState('')
  const [hobbyFilter, setHobbyFilter] = useState('전체')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setLoading(false)
        setError('로그인이 필요합니다.')
        return
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      setMe((myProfile as ProfileRow | null) ?? null)
      setRegionFilter(myProfile?.region ?? '')

      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocker_user_id,blocked_user_id')
        .or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`)

      setBlockedIds(
        new Set(
          (blocks ?? []).map((row) =>
            row.blocker_user_id === user.id ? row.blocked_user_id : row.blocker_user_id
          )
        )
      )

      const { data, error: qerr } = await supabase
        .from('profiles')
        .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
        .neq('user_id', user.id)
        .order('nickname', { ascending: true })

      if (qerr) {
        setError(qerr.message)
      } else {
        setProfiles((data ?? []) as ProfileRow[])
      }

      setLoading(false)
    })()
  }, [supabase])

  const hobbyOptions = useMemo(() => {
    const values = new Set<string>()
    profiles.forEach((profile) => {
      for (const hobby of profile.hobbies ?? []) values.add(hobby)
    })
    return ['전체', ...Array.from(values)]
  }, [profiles])

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (blockedIds.has(profile.user_id)) return false
      const matchesRegion =
        !regionFilter.trim() ||
        (profile.region ?? '').toLowerCase().includes(regionFilter.trim().toLowerCase())
      const matchesHobby =
        hobbyFilter === '전체' || (profile.hobbies ?? []).includes(hobbyFilter)
      return matchesRegion && matchesHobby
    })
  }, [blockedIds, hobbyFilter, profiles, regionFilter])

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">사람 찾기</h1>
          <p className="mt-2 text-muted-foreground font-medium">
            {me?.nickname ? `${me.nickname}님과 잘 맞을 만한 사람들을 둘러보세요.` : '추천 사람을 둘러보세요.'}
          </p>
        </header>

        <AppNav />

        {/* 필터 */}
        <section className="mt-6 bg-white p-5 rounded-[24px] border border-border/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={18} className="text-primary" />
            <span className="text-lg font-bold text-foreground">탐색 필터</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">지역</label>
              <input
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="예: 서울 마포구"
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">관심사</label>
              <select
                value={hobbyFilter}
                onChange={(e) => setHobbyFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {hobbyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 사람 목록 */}
        <section className="mt-6 space-y-4">
          {filteredProfiles.map((profile) => (
            <article
              key={profile.user_id}
              className="bg-white p-5 rounded-[24px] border border-border/50 shadow-sm"
            >
              <div className="flex gap-4 items-start">
                {/* 아바타 */}
                <Link href={`/people/${profile.user_id}`} className="shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.nickname} 프로필 사진`}
                      className="w-16 h-16 rounded-full object-cover bg-muted"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                      {profile.nickname.slice(0, 1)}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{profile.nickname}</h3>
                      <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                        <MapPin size={13} />
                        <span>{[profile.age_band, profile.region].filter(Boolean).join(' · ') || '기본 정보 없음'}</span>
                      </div>
                    </div>
                    {profile.relationship_purpose && (
                      <span className="shrink-0 px-2.5 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
                        {profile.relationship_purpose}
                      </span>
                    )}
                  </div>

                  {!!profile.hobbies?.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {profile.hobbies.map((hobby) => (
                        <span
                          key={hobby}
                          className="px-3 py-1 bg-muted rounded-full text-xs font-semibold text-foreground"
                        >
                          {hobby}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href={`/people/${profile.user_id}`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      상세 프로필 보기 →
                    </Link>
                  </div>

                  <div className="mt-2">
                    <RelationshipActions targetUserId={profile.user_id} compact />
                  </div>
                </div>
              </div>
            </article>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-border">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
                <Users size={40} />
              </div>
              <p className="text-muted-foreground font-bold text-lg">조건에 맞는 사람이 없어요.</p>
              <p className="text-muted-foreground text-sm mt-1">지역이나 관심사 필터를 넓혀 보세요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
