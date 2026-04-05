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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) return setError(error.message)
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>이메일을 확인해 주세요</h1>
        <p>가입하신 이메일로 인증 링크를 발송했습니다. 링크를 클릭하면 로그인됩니다.</p>
        <Link href="/login">로그인 페이지로</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>SilverLink 회원가입</h1>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 16 }}>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        />

        <label style={{ display: 'block', marginTop: 16 }}>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          required
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 12, padding: 12, width: '100%' }}
        >
          {loading ? '처리 중...' : '회원가입'}
        </button>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>

      <p style={{ marginTop: 16 }}>
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </p>
    </div>
  )
}
