'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/update-password`,
    })

    setLoading(false)
    if (error) return setError(error.message)
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>메일을 확인해 주세요</h1>
        <p>비밀번호 재설정 링크를 이메일로 발송했습니다.</p>
        <Link href="/login">로그인 페이지로</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>비밀번호 찾기</h1>

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

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 12, padding: 12, width: '100%' }}
        >
          {loading ? '발송 중...' : '재설정 메일 받기'}
        </button>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>

      <p style={{ marginTop: 16 }}>
        <Link href="/login">로그인으로 돌아가기</Link>
      </p>
    </div>
  )
}
