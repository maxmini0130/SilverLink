'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) return setError(error.message)
    setSent(true)
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>SilverLink 로그인</h1>

      {sent ? (
        <p>메일을 확인해 로그인 링크를 눌러주세요.</p>
      ) : (
        <form onSubmit={onSubmit}>
          <label style={{ display: 'block', marginTop: 16 }}>이메일</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            style={{ width: '100%', padding: 12, fontSize: 16 }}
          />
          <button style={{ marginTop: 12, padding: 12, width: '100%' }}>
            로그인 링크 받기
          </button>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
        </form>
      )}
    </div>
  )
}