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
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>SilverLink 로그인</h1>

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
          required
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 12, padding: 12, width: '100%' }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>

      <p style={{ marginTop: 16 }}>
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
      <p>
        비밀번호를 잊으셨나요? <Link href="/forgot">비밀번호 찾기</Link>
      </p>
    </div>
  )
}
