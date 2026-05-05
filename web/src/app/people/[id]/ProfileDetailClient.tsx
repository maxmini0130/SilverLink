'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ReportButton from '@/components/ReportButton'

type Profile = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[]
  bio: string
  avatar_url?: string | null
}

type Post = {
  id: number
  content: string
  created_at: string
}

type Props = {
  profile: Profile
  myId: string
  isFriend: boolean
  sentStatus: string | null
  receivedRequest: { id: number } | null
  recentPosts: Post[]
}

export default function ProfileDetailClient({
  profile,
  myId,
  isFriend,
  sentStatus,
  receivedRequest,
  recentPosts,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [relState, setRelState] = useState({ isFriend, sentStatus, receivedRequest })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendInterest() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('relationship_requests').insert({
      from_user_id: myId,
      to_user_id: profile.user_id,
      status: 'pending',
    })

    if (!err) {
      await supabase.from('notifications').insert({
        recipient_id: profile.user_id,
        actor_id: myId,
        type: 'interest',
        title: '새 관심이 도착했어요',
        body: '프로필에서 상대를 확인하고 천천히 응답해보세요.',
        href: '/me',
      })
      setRelState((state) => ({ ...state, sentStatus: 'pending' }))
    } else {
      setError(err.message)
    }
    setLoading(false)
  }

  async function cancelInterest() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('relationship_requests')
      .delete()
      .eq('from_user_id', myId)
      .eq('to_user_id', profile.user_id)
      .eq('status', 'pending')

    if (err) setError(err.message)
    else setRelState((state) => ({ ...state, sentStatus: null }))
    setLoading(false)
  }

  async function acceptRequest() {
    if (!relState.receivedRequest) return
    setLoading(true)
    setError(null)

    const { error: requestError } = await supabase
      .from('relationship_requests')
      .update({ status: 'accepted' })
      .eq('id', relState.receivedRequest.id)

    if (requestError) {
      setLoading(false)
      setError(requestError.message)
      return
    }

    const a = myId < profile.user_id ? myId : profile.user_id
    const b = myId < profile.user_id ? profile.user_id : myId
    const { error: friendshipError } = await supabase.from('friendships').insert({ user_id_a: a, user_id_b: b })

    if (friendshipError) {
      setLoading(false)
      setError(friendshipError.message)
      return
    }

    await supabase.from('notifications').insert({
      recipient_id: profile.user_id,
      actor_id: myId,
      type: 'interest_accepted',
      title: '관심이 연결됐어요',
      body: '이제 서로의 프로필에서 대화를 시작할 수 있어요.',
      href: `/people/${myId}`,
    })

    setRelState({ isFriend: true, sentStatus: null, receivedRequest: null })
    setLoading(false)
  }

  async function rejectRequest() {
    if (!relState.receivedRequest) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('relationship_requests')
      .update({ status: 'rejected' })
      .eq('id', relState.receivedRequest.id)

    if (err) setError(err.message)
    else setRelState((state) => ({ ...state, receivedRequest: null }))
    setLoading(false)
  }

  async function startMessage() {
    const a = myId < profile.user_id ? myId : profile.user_id
    const b = myId < profile.user_id ? profile.user_id : myId

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
    <div className="page" style={{ maxWidth: 480, paddingBottom: 100 }}>
      <Link href="/people" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)', fontSize: 16, marginBottom: 20, textDecoration: 'none' }}>
        사람 목록
      </Link>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', marginBottom: 16 }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.nickname} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            {profile.nickname.slice(0, 1)}
          </div>
        )}

        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{profile.nickname}</div>
        <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 16 }}>
          {profile.age_band}세 · {profile.region}
        </div>

        {profile.hobbies.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            {profile.hobbies.map((hobby) => (
              <span key={hobby} style={{ background: '#eff6ff', color: 'var(--primary)', borderRadius: 999, padding: '4px 12px', fontSize: 15 }}>
                {hobby}
              </span>
            ))}
          </div>
        )}

        {profile.bio && (
          <p style={{ fontSize: 16, color: '#444', lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
            {profile.bio}
          </p>
        )}
      </div>

      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        {relState.isFriend ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 17, color: '#16a34a', fontWeight: 700 }}>1촌 관계입니다</div>
            <button className="btn-primary" onClick={startMessage}>대화 보내기</button>
          </div>
        ) : relState.receivedRequest ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>
              이 분이 관심을 보냈어요
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={loading} onClick={acceptRequest}>
                {loading ? '처리 중...' : '수락하기'}
              </button>
              <button className="btn-outline" style={{ flex: 1 }} disabled={loading} onClick={rejectRequest}>
                거절하기
              </button>
            </div>
          </div>
        ) : relState.sentStatus === 'pending' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 17, color: 'var(--muted)' }}>
              관심을 보냈어요. 상대의 응답을 기다리고 있어요.
            </div>
            <button className="btn-outline" disabled={loading} onClick={cancelInterest}>
              {loading ? '처리 중...' : '관심 취소'}
            </button>
          </div>
        ) : relState.sentStatus === 'accepted' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 17, color: '#16a34a', marginBottom: 4 }}>서로 관심이 연결됐어요</div>
            <button className="btn-primary" onClick={startMessage}>대화 보내기</button>
          </div>
        ) : (
          <button className="btn-primary" disabled={loading} onClick={sendInterest}>
            {loading ? '보내는 중...' : '관심 보내기'}
          </button>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      {recentPosts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>최근 공개 글</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPosts.map((post) => (
              <div key={post.id} className="card" style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: 16, lineHeight: 1.7, margin: '0 0 8px', color: '#222' }}>
                  {post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content}
                </p>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '16px 20px' }}>
        <ReportButton reportedUserId={profile.user_id} myId={myId} />
      </div>
    </div>
  )
}
