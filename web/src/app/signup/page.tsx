'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)
    if (error) return setError(error.message)

    if (data.user) {
      await supabase.from('events').insert({
        user_id: data.user.id,
        event_type: 'sign_up_completed',
        payload: { email },
      })
    }

    setDone(true)
  }

  async function signInWithGoogle() {
    setSocialLoading('google')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signInWithKakao() {
    setSocialLoading('kakao')
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function signInWithNaver() {
    setSocialLoading('naver')
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    if (!clientId) {
      setError('네이버 로그인이 아직 준비되지 않았어요.')
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>이메일을 확인해 주세요</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
          가입하신 이메일로 인증 링크를 발송했어요.<br />링크를 클릭하시면 로그인됩니다.
        </p>
        <Link href="/login" style={{ color: 'var(--primary)', fontSize: 18 }}>로그인 페이지로 →</Link>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>WithDay</h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>회원가입</p>
      </div>

      {/* 소셜 가입 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <button
          onClick={signInWithGoogle}
          disabled={!!socialLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            minHeight: 52,
            padding: '0 20px',
            borderRadius: 12,
            border: '1.5px solid #dadce0',
            background: '#fff',
            fontSize: 17,
            fontWeight: 600,
            color: '#3c4043',
            cursor: 'pointer',
            opacity: socialLoading && socialLoading !== 'google' ? 0.5 : 1,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
          </svg>
          {socialLoading === 'google' ? '처리 중...' : '구글로 시작하기'}
        </button>

        <button
          onClick={signInWithKakao}
          disabled={!!socialLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            minHeight: 52,
            padding: '0 20px',
            borderRadius: 12,
            border: 'none',
            background: '#FEE500',
            fontSize: 17,
            fontWeight: 600,
            color: '#000',
            cursor: 'pointer',
            opacity: socialLoading && socialLoading !== 'kakao' ? 0.5 : 1,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C6.477 3 2 6.58 2 11c0 2.8 1.7 5.26 4.3 6.77L5.1 21l4.7-2.4c.7.1 1.45.16 2.2.16 5.523 0 10-3.58 10-8S17.523 3 12 3z" fill="#3A1D1D"/>
          </svg>
          {socialLoading === 'kakao' ? '처리 중...' : '카카오로 시작하기'}
        </button>

        <button
          onClick={signInWithNaver}
          disabled={!!socialLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            minHeight: 52,
            padding: '0 20px',
            borderRadius: 12,
            border: 'none',
            background: '#03C75A',
            fontSize: 17,
            fontWeight: 600,
            color: '#fff',
            cursor: 'pointer',
            opacity: socialLoading && socialLoading !== 'naver' ? 0.5 : 1,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Arial, sans-serif', lineHeight: 1 }}>N</span>
          {socialLoading === 'naver' ? '처리 중...' : '네이버로 시작하기'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--muted)', fontSize: 15 }}>또는 이메일로</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>이메일</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          style={{ marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>비밀번호</label>
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
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>로그인</Link>
      </p>
    </div>
  )
}
