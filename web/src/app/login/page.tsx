'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>로딩 중...</div>}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const err = searchParams.get('err')
    if (err) setError(`인증 콜백 오류: ${err}`)
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ padding: 32, maxWidth: 440, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>SilverLink 로그인</h1>
      <p style={{ marginTop: 8, color: '#57534e', fontSize: 16 }}>이메일과 비밀번호를 입력해 주세요.</p>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 20, fontSize: 16, fontWeight: 600 }}>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          style={{ width: '100%', padding: 14, fontSize: 18, marginTop: 8, borderRadius: 10, border: '1px solid #d6d3d1', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', marginTop: 20, fontSize: 16, fontWeight: 600 }}>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 14, fontSize: 18, marginTop: 8, borderRadius: 10, border: '1px solid #d6d3d1', boxSizing: 'border-box' }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 24, padding: 16, width: '100%', fontSize: 18, fontWeight: 700, borderRadius: 12, background: '#1c1917', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {error && <p style={{ marginTop: 12, color: 'crimson', fontSize: 15 }}>{error}</p>}
      </form>

      <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 16 }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" style={{ fontWeight: 700, color: '#1c1917' }}>회원가입</Link>
        </p>
        <p style={{ fontSize: 16 }}>
          비밀번호를 잊으셨나요?{' '}
          <Link href="/forgot" style={{ fontWeight: 700, color: '#1c1917' }}>비밀번호 찾기</Link>
        </p>
      </div>
    </div>
  )
}
