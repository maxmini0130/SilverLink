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

    // 회원가입 이벤트 로깅
    if (data.user) {
      await supabase.from('events').insert({
        user_id: data.user.id,
        event_type: 'sign_up_completed',
        payload: { email },
      })
    }

    setDone(true)
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>SilverLink</h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>회원가입</p>
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
          {loading ? '처리 중...' : '회원가입'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: 17 }}>
        이미 계정이 있으신가요?{' '}
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>로그인</Link>
      </p>
    </div>
  )
}
