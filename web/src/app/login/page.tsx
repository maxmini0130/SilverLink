'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ENABLE_GOOGLE = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
const ENABLE_KAKAO = process.env.NEXT_PUBLIC_ENABLE_KAKAO_AUTH === 'true'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.')
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('events').insert({
        user_id: data.user.id,
        event_type: 'login',
        payload: {},
      })
    }

    router.push('/')
    router.refresh()
  }

  async function signInWithOAuth(provider: 'google' | 'kakao') {
    setError(null)
    setSocialLoading(provider)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (oauthError) {
      setError('소셜 로그인이 아직 설정되지 않았어요. 이메일 로그인을 이용해주세요.')
      setSocialLoading(null)
    }
  }

  function signInWithNaver() {
    setError(null)
    setSocialLoading('naver')
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    if (!clientId) {
      setError('네이버 로그인이 아직 준비되지 않았어요. 이메일 로그인을 이용해주세요.')
      setSocialLoading(null)
      return
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/naver/callback`)
    const state = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('naver_oauth_state', state)
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
  }

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginBottom: 8 }}>WithDay</div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>로그인</h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>좋은 인연을 천천히 이어가요.</p>
      </div>

      {(ENABLE_GOOGLE || ENABLE_KAKAO || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID) && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {ENABLE_GOOGLE && (
              <button className="btn-outline" onClick={() => signInWithOAuth('google')} disabled={!!socialLoading}>
                {socialLoading === 'google' ? '로그인 중...' : '구글로 계속하기'}
              </button>
            )}
            {ENABLE_KAKAO && (
              <button
                onClick={() => signInWithOAuth('kakao')}
                disabled={!!socialLoading}
                style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', background: '#FEE500', color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}
              >
                {socialLoading === 'kakao' ? '로그인 중...' : '카카오로 계속하기'}
              </button>
            )}
            {process.env.NEXT_PUBLIC_NAVER_CLIENT_ID && (
              <button
                onClick={signInWithNaver}
                disabled={!!socialLoading}
                style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', background: '#03C75A', color: '#fff', fontSize: 18, fontWeight: 700 }}
              >
                {socialLoading === 'naver' ? '로그인 중...' : '네이버로 계속하기'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--muted)', fontSize: 15 }}>또는 이메일로</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        </>
      )}

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>이메일</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          style={{ marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>비밀번호</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: 8 }}
        />

        {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? '로그인 중...' : '이메일로 로그인'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: 17 }}>
        <Link href="/forgot" style={{ color: 'var(--primary)' }}>비밀번호를 잊으셨나요?</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: 8, color: 'var(--muted)', fontSize: 17 }}>
        계정이 없으신가요?{' '}
        <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>회원가입</Link>
      </p>
    </div>
  )
}
