'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.')
      setLoading(false)
      return
    }

    // 로그인 이벤트 로깅
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

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>WithDay</h1>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>로그인</p>
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
          required
          style={{ marginBottom: 8 }}
        />

        {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: 17 }}>
        <Link href="/forgot" style={{ color: 'var(--primary)' }}>비밀번호를 잊으셨나요?</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: 8, color: 'var(--muted)', fontSize: 17 }}>
        계정이 없으신가요?{' '}
        <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>회원가입</Link>
      </p>
    </div>
  )
}
