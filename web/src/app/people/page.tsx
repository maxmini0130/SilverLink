'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { RelationshipActions } from '@/components/relationship-actions'

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

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>사람 찾기</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        {me?.nickname ? `${me.nickname}님과 잘 맞을 만한 사람들을 둘러보세요.` : '추천 사람을 둘러보세요.'}
      </p>
      <AppNav />

      <section
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 16,
          background: '#f5f5f4',
          border: '1px solid #e7e5e4',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>탐색 필터</div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>지역</label>
            <input
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              placeholder="예: 서울 마포구"
              style={{ width: '100%', padding: 12, fontSize: 16 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>관심사</label>
            <select
              value={hobbyFilter}
              onChange={(e) => setHobbyFilter(e.target.value)}
              style={{ width: '100%', padding: 12, fontSize: 16 }}
            >
              {hobbyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20, display: 'grid', gap: 14 }}>
        {filteredProfiles.map((profile) => (
          <article
            key={profile.user_id}
            style={{
              padding: 18,
              borderRadius: 18,
              border: '1px solid #e7e5e4',
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} size={72} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.nickname}</div>
                <div style={{ marginTop: 4, color: '#57534e' }}>
                  {[profile.age_band, profile.region].filter(Boolean).join(' · ') || '기본 정보를 준비 중이에요.'}
                </div>
                {profile.relationship_purpose && (
                  <div style={{ marginTop: 8, fontSize: 15 }}>관계 목적: {profile.relationship_purpose}</div>
                )}
                <div style={{ marginTop: 10 }}>
                  <Link
                    href={`/people/${profile.user_id}`}
                    style={{
                      textDecoration: 'underline',
                      color: '#57534e',
                      fontWeight: 600,
                    }}
                  >
                    상세 프로필 보기
                  </Link>
                </div>
                {!!profile.hobbies?.length && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profile.hobbies.map((hobby) => (
                      <span
                        key={hobby}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: '#f5f5f4',
                          fontSize: 14,
                        }}
                      >
                        {hobby}
                      </span>
                    ))}
                  </div>
                )}
                <RelationshipActions targetUserId={profile.user_id} compact />
              </div>
            </div>
          </article>
        ))}
        {filteredProfiles.length === 0 && (
          <div style={{ padding: 24, borderRadius: 16, background: '#fafaf9', color: '#57534e' }}>
            조건에 맞는 사용자가 아직 없어요. 지역이나 관심사 필터를 조금 넓혀 보세요.
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileAvatar({
  avatarUrl,
  nickname,
  size,
}: {
  avatarUrl: string | null
  nickname: string
  size: number
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          background: '#e7e5e4',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        color: '#1c1917',
        fontSize: size / 2.3,
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
  )
}
