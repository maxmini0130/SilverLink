'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'

export type Profile = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[]
  bio: string
  avatar_url?: string | null
}

export type Group = {
  id: string
  title: string
  category: string
  region: string
}

export type PendingRequest = {
  id: number
  from_user_id: string
  profiles: { nickname: string } | { nickname: string }[] | null
}

export type Block = {
  blocked_id: string
  profiles: { nickname: string } | { nickname: string }[] | null
}

const HOBBIES_ALL = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구']
const AGE_BANDS = ['60-64', '65-69', '70-74', '75-79', '80+']

function firstProfile(profile: { nickname: string } | { nickname: string }[] | null) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile
}

export default function MeClient({
  profile,
  myGroups,
  pendingRequests,
  friendCount,
  blocks,
}: {
  profile: Profile
  myGroups: Group[]
  pendingRequests: PendingRequest[]
  friendCount: number
  blocks: Block[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(profile.nickname)
  const [ageBand, setAgeBand] = useState(profile.age_band)
  const [region, setRegion] = useState(profile.region)
  const [hobbies, setHobbies] = useState<string[]>(profile.hobbies ?? [])
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<PendingRequest[]>(pendingRequests)
  const [blockList, setBlockList] = useState<Block[]>(blocks)

  function toggleHobby(hobby: string) {
    setHobbies((prev) => prev.includes(hobby) ? prev.filter((item) => item !== hobby) : [...prev, hobby])
  }

  async function saveProfile() {
    if (!nickname.trim() || !region.trim()) {
      setError('닉네임과 지역을 입력해주세요.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        age_band: ageBand,
        region: region.trim(),
        hobbies,
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profile.user_id)

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function acceptRequest(req: PendingRequest) {
    await supabase.from('relationship_requests').update({ status: 'accepted' }).eq('id', req.id)
    const a = profile.user_id < req.from_user_id ? profile.user_id : req.from_user_id
    const b = profile.user_id < req.from_user_id ? req.from_user_id : profile.user_id
    await supabase.from('friendships').insert({ user_id_a: a, user_id_b: b })
    await supabase.from('notifications').insert({
      recipient_id: req.from_user_id,
      actor_id: profile.user_id,
      type: 'interest_accepted',
      title: '관심이 연결됐어요',
      body: '이제 서로의 프로필에서 대화를 시작할 수 있어요.',
      href: `/people/${profile.user_id}`,
    })
    setRequests(requests.filter((item) => item.id !== req.id))
  }

  async function rejectRequest(req: PendingRequest) {
    await supabase.from('relationship_requests').update({ status: 'rejected' }).eq('id', req.id)
    setRequests(requests.filter((item) => item.id !== req.id))
  }

  async function unblock(blockedId: string) {
    await supabase.from('blocks').delete().eq('blocker_id', profile.user_id).eq('blocked_id', blockedId)
    setBlockList(blockList.filter((item) => item.blocked_id !== blockedId))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>내 정보</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        {editing ? (
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>닉네임</label>
            <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ marginBottom: 12 }} />

            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>나이대</label>
            <select className="input" value={ageBand} onChange={(e) => setAgeBand(e.target.value)} style={{ marginBottom: 12 }}>
              {AGE_BANDS.map((age) => <option key={age} value={age}>{age}</option>)}
            </select>

            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>지역</label>
            <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} style={{ marginBottom: 12 }} />

            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>취미</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {HOBBIES_ALL.map((hobby) => (
                <button key={hobby} type="button" onClick={() => toggleHobby(hobby)}
                  style={{ padding: '10px 14px', borderRadius: 999, border: `2px solid ${hobbies.includes(hobby) ? 'var(--primary)' : 'var(--border)'}`, background: hobbies.includes(hobby) ? '#eff6ff' : 'transparent', color: hobbies.includes(hobby) ? 'var(--primary)' : 'var(--foreground)', fontSize: 16, minHeight: 'auto', cursor: 'pointer' }}>
                  {hobby}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>자기소개</label>
            <textarea className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자신을 소개해보세요." style={{ minHeight: 80, resize: 'vertical', marginBottom: 12 }} />

            {error && <p className="error-text">{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
              <button className="btn-outline" onClick={() => setEditing(false)}>취소</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              <AvatarUpload
                userId={profile.user_id}
                currentUrl={avatarUrl}
                nickname={profile.nickname}
                onUploaded={(url) => setAvatarUrl(url)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{profile.nickname}</div>
                <div style={{ color: 'var(--muted)', fontSize: 16, marginTop: 4 }}>{profile.age_band}세 · {profile.region}</div>
              </div>
              <button className="btn-outline" style={{ width: 'auto', padding: '10px 18px', fontSize: 16 }} onClick={() => setEditing(true)}>수정</button>
            </div>
            {profile.bio && <p style={{ fontSize: 16, lineHeight: 1.6, color: '#444', marginBottom: 10 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(profile.hobbies ?? []).map((hobby) => (
                <span key={hobby} style={{ background: '#eff6ff', color: 'var(--primary)', borderRadius: 999, padding: '4px 12px', fontSize: 15 }}>{hobby}</span>
              ))}
            </div>
            <div style={{ marginTop: 14, color: 'var(--muted)', fontSize: 16 }}>1촌 {friendCount}명</div>
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>받은 관심 ({requests.length})</h2>
          {requests.map((req) => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 17 }}>{firstProfile(req.profiles)?.nickname ?? '이름 없음'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 16px', fontSize: 15 }} onClick={() => acceptRequest(req)}>수락</button>
                <button className="btn-outline" style={{ padding: '10px 16px', fontSize: 15 }} onClick={() => rejectRequest(req)}>거절</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>내 모임 ({myGroups.length})</h2>
        {myGroups.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 16 }}>
            아직 참여 중인 모임이 없어요.{' '}
            <Link href="/groups" style={{ color: 'var(--primary)' }}>모임 찾기</Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{group.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>{group.category} · {group.region}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {blockList.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>차단한 사람</h2>
          {blockList.map((block) => (
            <div key={block.blocked_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 17 }}>{firstProfile(block.profiles)?.nickname ?? '이름 없음'}</span>
              <button className="btn-outline" style={{ padding: '8px 16px', fontSize: 15, color: '#dc2626', borderColor: '#dc2626' }} onClick={() => unblock(block.blocked_id)}>
                차단 해제
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={signOut} style={{ width: '100%', padding: '16px', background: 'none', border: '1px solid var(--border)', borderRadius: 14, fontSize: 18, color: '#dc2626', cursor: 'pointer', marginTop: 8 }}>
        로그아웃
      </button>
    </div>
  )
}
