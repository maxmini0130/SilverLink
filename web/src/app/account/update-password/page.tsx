'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setError(error.message)
    router.push('/login')
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>새 비밀번호 설정</h1>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 16 }}>새 비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          required
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        />

        <label style={{ display: 'block', marginTop: 16 }}>비밀번호 확인</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          style={{ width: '100%', padding: 12, fontSize: 16 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 12, padding: 12, width: '100%' }}
        >
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </div>
  )
}
