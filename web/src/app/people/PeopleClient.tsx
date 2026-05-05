'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export type Person = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[]
  bio: string
  avatar_url?: string | null
  commonHobbies: string[]
  sameRegion: boolean
  requestStatus: string | null
  isFriend: boolean
}

export default function PeopleClient({ people, myId }: { people: Person[]; myId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [list, setList] = useState<Person[]>(people)
  const [loading, setLoading] = useState<string | null>(null)

  async function sendInterest(target: Person) {
    setLoading(target.user_id)
    const { error } = await supabase.from('relationship_requests').insert({
      from_user_id: myId,
      to_user_id: target.user_id,
      status: 'pending',
    })

    if (!error) {
      await supabase.from('notifications').insert({
        recipient_id: target.user_id,
        actor_id: myId,
        type: 'interest',
        title: '새 관심이 도착했어요',
        body: '프로필에서 상대를 확인하고 천천히 응답해보세요.',
        href: '/me',
      })
      setList(list.map((person) => person.user_id === target.user_id ? { ...person, requestStatus: 'pending' } : person))
    }
    setLoading(null)
  }

  async function startMessage(targetId: string) {
    const a = myId < targetId ? myId : targetId
    const b = myId < targetId ? targetId : myId

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id_a', a)
      .eq('user_id_b', b)
      .maybeSingle()

    if (existing) {
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: created } = await supabase
      .from('conversations')
      .insert({ user_id_a: a, user_id_b: b })
      .select('id')
      .single()

    if (created) router.push(`/messages/${created.id}`)
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>사람 찾기</h1>
      <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 20 }}>
        취미와 지역이 비슷한 분들을 살펴보세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            아직 추천할 사람이 없어요
          </div>
        )}
        {list.map((person) => (
          <div key={person.user_id} className="card">
            <Link href={`/people/${person.user_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {person.avatar_url ? (
                <img src={person.avatar_url} alt={person.nickname} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                  {person.nickname.slice(0, 1)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{person.nickname}</div>
                <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 4 }}>
                  {person.age_band}세 · {person.region}
                  {person.sameRegion && <span style={{ color: 'var(--primary)', marginLeft: 6 }}>같은 지역</span>}
                </div>
                {person.commonHobbies.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {person.commonHobbies.map((hobby) => (
                      <span key={hobby} style={{ background: '#eff6ff', color: 'var(--primary)', borderRadius: 999, padding: '3px 10px', fontSize: 14 }}>
                        {hobby}
                      </span>
                    ))}
                  </div>
                )}
                {person.bio && <p style={{ fontSize: 15, marginTop: 8, color: '#444', lineHeight: 1.5 }}>{person.bio}</p>}
              </div>
            </Link>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {person.isFriend ? (
                <>
                  <span style={{ color: '#16a34a', fontSize: 15, fontWeight: 600, padding: '12px 0' }}>1촌</span>
                  <button className="btn-outline" style={{ flex: 1, padding: '12px 16px' }} onClick={() => startMessage(person.user_id)}>
                    대화 보내기
                  </button>
                </>
              ) : person.requestStatus === 'pending' ? (
                <span style={{ color: 'var(--muted)', fontSize: 15, padding: '12px 0' }}>관심을 보냈어요</span>
              ) : person.requestStatus === 'accepted' ? (
                <span style={{ color: '#16a34a', fontSize: 15, padding: '12px 0' }}>상대가 관심을 수락했어요</span>
              ) : (
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading === person.user_id}
                  onClick={() => sendInterest(person)}
                >
                  {loading === person.user_id ? '보내는 중...' : '관심 보내기'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
