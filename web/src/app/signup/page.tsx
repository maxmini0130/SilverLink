'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ENABLE_GOOGLE = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
const ENABLE_KAKAO = process.env.NEXT_PUBLIC_ENABLE_KAKAO_AUTH === 'true'

export default function SignupPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.user) {
      await supabase.from('events').insert({
        user_id: data.user.id,
        event_type: 'sign_up_completed',
        payload: { email },
      })
    }

    setDone(true)
  }

  async function signInWithOAuth(provider: 'google' | 'kakao') {
    setError(null)
    setSocialLoading(provider)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (oauthError) {
      setError('소셜 가입이 아직 설정되지 않았어요. 이메일 가입을 이용해주세요.')
      setSocialLoading(null)
    }
  }

  function signInWithNaver() {
    setError(null)
    setSocialLoading('naver')
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    if (!clientId) {
      setError('네이버 가입이 아직 준비되지 않았어요. 이메일 가입을 이용해주세요.')
      setSocialLoading(null)
      return
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/naver/callback`)
    const state = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('naver_oauth_state', state)
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
  }

  if (done) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>이메일을 확인해주세요</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
          가입한 이메일로 인증 링크를 보냈어요.
          <br />
          링크를 누르면 로그인을 계속할 수 있습니다.
        </p>
        <Link href="/login" style={{ color: 'var(--primary)', fontSize: 18 }}>로그인 페이지로 이동</Link>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginBottom: 8 }}>WithDay</div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>회원가입</h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>가볍게 시작하고 천천히 알아가요.</p>
      </div>

      {(ENABLE_GOOGLE || ENABLE_KAKAO || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID) && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {ENABLE_GOOGLE && (
              <button className="btn-outline" onClick={() => signInWithOAuth('google')} disabled={!!socialLoading}>
                {socialLoading === 'google' ? '처리 중...' : '구글로 시작하기'}
              </button>
            )}
            {ENABLE_KAKAO && (
              <button
                onClick={() => signInWithOAuth('kakao')}
                disabled={!!socialLoading}
                style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', background: '#FEE500', color: '#1a1a1a', fontSize: 18, fontWeight: 700 }}
              >
                {socialLoading === 'kakao' ? '처리 중...' : '카카오로 시작하기'}
              </button>
            )}
            {process.env.NEXT_PUBLIC_NAVER_CLIENT_ID && (
              <button
                onClick={signInWithNaver}
                disabled={!!socialLoading}
                style={{ width: '100%', minHeight: 52, borderRadius: 14, border: 'none', background: '#03C75A', color: '#fff', fontSize: 18, fontWeight: 700 }}
              >
                {socialLoading === 'naver' ? '처리 중...' : '네이버로 시작하기'}
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
          placeholder="6자 이상 입력"
          required
          style={{ marginBottom: 8 }}
        />

        {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? '처리 중...' : '이메일로 회원가입'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: 17 }}>
        이미 계정이 있으신가요?{' '}
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>로그인</Link>
      </p>
    </div>
  )
}
