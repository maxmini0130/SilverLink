'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">로딩 중...</div>}>
      <LoginPageInner />
    </Suspense>
  )
}

const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
const labelClass = "block text-base font-bold text-foreground mb-2"

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
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">SilverLink</h1>
          <p className="mt-3 text-muted-foreground font-medium">이메일과 비밀번호를 입력해 주세요.</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {error && (
            <p className="px-4 py-3 rounded-xl bg-red-50 text-red-700 font-semibold border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-white text-lg font-extrabold shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-base text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-bold text-primary hover:underline">회원가입</Link>
          </p>
          <p className="text-base text-muted-foreground">
            비밀번호를 잊으셨나요?{' '}
            <Link href="/forgot" className="font-bold text-primary hover:underline">비밀번호 찾기</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
