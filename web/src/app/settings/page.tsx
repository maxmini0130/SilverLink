'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

type Visibility = 'private' | 'friends' | 'interested' | 'same_group' | 'members'

type BlockedProfile = {
  user_id: string
  nickname: string
  region: string | null
}

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string }> = [
  { value: 'private', label: '나만 보기' },
  { value: 'friends', label: '1촌만 보기' },
  { value: 'interested', label: '관심 있는 사람만 보기' },
  { value: 'same_group', label: '같은 모임 사람만 보기' },
  { value: 'members', label: '전체 인증회원 보기' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>('members')
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const [profileRes, blocksRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('default_post_visibility')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('blocks')
          .select('blocked_user_id')
          .eq('blocker_user_id', user.id),
      ])

      if (profileRes.error || blocksRes.error) {
        setError(profileRes.error?.message || blocksRes.error?.message || '설정을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      setDefaultVisibility(
        ((profileRes.data?.default_post_visibility as Visibility | null) ?? 'members')
      )

      const blockedIds = (blocksRes.data ?? []).map((row) => row.blocked_user_id as string)
      if (blockedIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id,nickname,region')
          .in('user_id', blockedIds)

        if (profilesError) {
          setError(profilesError.message)
          setLoading(false)
          return
        }

        setBlockedProfiles((profiles ?? []) as BlockedProfile[])
      }

      setLoading(false)
    })()
  }, [supabase])

  async function saveDefaultVisibility() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      setError('로그인이 필요합니다.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ default_post_visibility: defaultVisibility })
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
    } else {
      setMessage('기본 공개범위를 저장했습니다.')
    }

    setSaving(false)
  }

  async function unblock(targetUserId: string) {
    setError(null)
    const response = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, action: 'unblock' }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? '차단 해제에 실패했습니다.')
      return
    }

    setBlockedProfiles((prev) => prev.filter((profile) => profile.user_id !== targetUserId))
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error && !message) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>설정 / 고객센터</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        공개범위 기본값과 차단 목록을 관리하고, 문의 안내를 확인하세요.
      </p>
      <AppNav />

      <section style={cardStyle}>
        <h2 style={titleStyle}>공개범위 기본값</h2>
        <p style={descStyle}>새 피드를 작성할 때 기본으로 선택될 공개범위입니다.</p>
        <select
          value={defaultVisibility}
          onChange={(e) => setDefaultVisibility(e.target.value as Visibility)}
          style={{ width: '100%', padding: 12, fontSize: 16, marginTop: 12 }}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button onClick={saveDefaultVisibility} disabled={saving} style={{ marginTop: 12, padding: '12px 16px' }}>
          {saving ? '저장 중...' : '기본값 저장'}
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>차단 목록</h2>
        <p style={descStyle}>차단한 사용자는 사람/피드/대화 화면에서 숨겨집니다.</p>
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {blockedProfiles.map((profile) => (
            <div key={profile.user_id} style={listRowStyle}>
              <div>
                <div style={{ fontWeight: 700 }}>{profile.nickname}</div>
                <div style={{ color: '#57534e', marginTop: 4 }}>{profile.region ?? '지역 정보 없음'}</div>
              </div>
              <button onClick={() => unblock(profile.user_id)} style={{ padding: '10px 14px' }}>
                차단 해제
              </button>
            </div>
          ))}
          {blockedProfiles.length === 0 && <div style={{ color: '#57534e' }}>차단한 사용자가 없어요.</div>}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>고객센터</h2>
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div style={listRowStyle}>
            <div>
              <div style={{ fontWeight: 700 }}>문의 메일</div>
              <div style={{ color: '#57534e', marginTop: 4 }}>support@silverlink.local</div>
            </div>
            <a href="mailto:support@silverlink.local" style={{ textDecoration: 'underline', color: '#57534e' }}>
              메일 보내기
            </a>
          </div>
          <div style={listRowStyle}>
            <div>
              <div style={{ fontWeight: 700 }}>비밀번호/로그인 문제</div>
              <div style={{ color: '#57534e', marginTop: 4 }}>로그인 화면의 비밀번호 찾기에서 재설정을 진행할 수 있어요.</div>
            </div>
            <Link href="/forgot" style={{ textDecoration: 'underline', color: '#57534e' }}>
              재설정
            </Link>
          </div>
        </div>
      </section>

      {(error || message) && (
        <p style={{ marginTop: 12, color: error ? 'crimson' : '#166534' }}>{error ?? message}</p>
      )}
    </div>
  )
}

const cardStyle = {
  marginTop: 20,
  padding: 20,
  borderRadius: 20,
  border: '1px solid #e7e5e4',
  background: '#fff',
} as const

const titleStyle = {
  fontSize: 22,
  fontWeight: 700,
} as const

const descStyle = {
  marginTop: 6,
  color: '#57534e',
} as const

const listRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  padding: 14,
  borderRadius: 14,
  background: '#fafaf9',
} as const
