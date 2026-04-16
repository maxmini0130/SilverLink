'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
const labelClass = "block text-base font-bold text-foreground mb-2"

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
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="bg-white p-10 rounded-[32px] border border-border/50 shadow-sm">
            <h1 className="text-2xl font-extrabold text-foreground mb-4">이메일을 확인해 주세요</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              가입하신 이메일로 인증 링크를 발송했어요.<br />
              링크를 클릭하면 로그인됩니다.
            </p>
            <Link href="/login" className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90">
              로그인 페이지로
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">SilverLink</h1>
          <p className="mt-3 text-muted-foreground font-medium">이메일 인증 후 바로 시작할 수 있어요.</p>
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
              placeholder="6자 이상"
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
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-bold text-primary hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  )
}
