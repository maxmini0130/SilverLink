'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Person = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[]
  bio: string
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

  async function sendInterest(targetId: string) {
    setLoading(targetId)
    const { error } = await supabase.from('relationship_requests').insert({
      from_user_id: myId,
      to_user_id: targetId,
      status: 'pending',
    })
    setLoading(null)
    if (!error) {
      setList(list.map((p) => p.user_id === targetId ? { ...p, requestStatus: 'pending' } : p))
    }
  }

  async function startMessage(targetId: string) {
    // 대화방 생성 or 조회
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
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>사람 탐색</h1>
      <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 20 }}>취미와 지역이 비슷한 분들이에요</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            아직 다른 회원이 없어요.
          </div>
        )}
        {list.map((p) => (
          <div key={p.user_id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{p.nickname}</div>
                <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 4 }}>
                  {p.age_band}세 · {p.region}
                  {p.sameRegion && <span style={{ color: 'var(--primary)', marginLeft: 6 }}>📍 내 지역</span>}
                </div>
                {p.commonHobbies.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.commonHobbies.map((h) => (
                      <span key={h} style={{ background: '#eff6ff', color: 'var(--primary)', borderRadius: 999, padding: '3px 10px', fontSize: 14 }}>
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {p.bio && <p style={{ fontSize: 15, marginTop: 8, color: '#444', lineHeight: 1.5 }}>{p.bio}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {p.isFriend ? (
                <>
                  <span style={{ color: '#16a34a', fontSize: 15, fontWeight: 600, padding: '12px 0' }}>✅ 1촌</span>
                  <button className="btn-outline" style={{ flex: 1, padding: '12px 16px' }} onClick={() => startMessage(p.user_id)}>
                    메시지 보내기
                  </button>
                </>
              ) : p.requestStatus === 'pending' ? (
                <span style={{ color: 'var(--muted)', fontSize: 15, padding: '12px 0' }}>관심 보냄 ⏳</span>
              ) : p.requestStatus === 'accepted' ? (
                <span style={{ color: '#16a34a', fontSize: 15, padding: '12px 0' }}>수락됨 ✅</span>
              ) : (
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading === p.user_id}
                  onClick={() => sendInterest(p.user_id)}
                >
                  {loading === p.user_id ? '보내는 중...' : '관심 보내기 💌'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
