'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"

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
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="bg-white p-10 rounded-[32px] border border-border/50 shadow-sm">
            <h1 className="text-2xl font-extrabold text-foreground mb-4">메일을 확인해 주세요</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              비밀번호 재설정 링크를 이메일로 발송했어요.
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
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">비밀번호 찾기</h1>
          <p className="mt-3 text-muted-foreground font-medium">가입한 이메일을 입력하면 재설정 링크를 보내드려요.</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-base font-bold text-foreground mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
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
            {loading ? '발송 중...' : '재설정 메일 받기'}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-muted-foreground">
          <Link href="/login" className="font-bold text-primary hover:underline">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
