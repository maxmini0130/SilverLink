'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { Globe, Shield, HeadphonesIcon, Mail, KeyRound, ChevronRight, X } from 'lucide-react'
import { VISIBILITY_OPTIONS, type Visibility } from '@/lib/visibility'

type BlockedProfile = {
  user_id: string
  nickname: string
  region: string | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>('members')
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }

      const [profileRes, blocksRes] = await Promise.all([
        supabase.from('profiles').select('default_post_visibility').eq('user_id', user.id).maybeSingle(),
        supabase.from('blocks').select('blocked_user_id').eq('blocker_user_id', user.id),
      ])

      if (profileRes.error || blocksRes.error) {
        setError(profileRes.error?.message || blocksRes.error?.message || '설정을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      setDefaultVisibility(((profileRes.data?.default_post_visibility as Visibility | null) ?? 'members'))

      const blockedIds = (blocksRes.data ?? []).map((row) => row.blocked_user_id as string)
      if (blockedIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id,nickname,region').in('user_id', blockedIds)
        if (profilesError) { setError(profilesError.message); setLoading(false); return }
        setBlockedProfiles((profiles ?? []) as BlockedProfile[])
      }
      setLoading(false)
    })()
  }, [supabase])

  async function saveDefaultVisibility() {
    setSaving(true)
    setError(null)
    setMessage(null)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) { setError('로그인이 필요합니다.'); setSaving(false); return }
    const { error } = await supabase.from('profiles').update({ default_post_visibility: defaultVisibility }).eq('user_id', user.id)
    if (error) setError(error.message)
    else setMessage('기본 공개범위를 저장했습니다.')
    setSaving(false)
  }

  async function unblock(targetUserId: string) {
    setError(null)
    const response = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, action: 'unblock' }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) { setError(payload?.error ?? '차단 해제에 실패했습니다.'); return }
    setBlockedProfiles((prev) => prev.filter((p) => p.user_id !== targetUserId))
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error && !message) return <div className="p-10 text-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">설정</h1>
          <p className="mt-2 text-muted-foreground font-medium">공개범위 기본값과 차단 목록을 관리하세요.</p>
        </header>

        <AppNav />

        <div className="mt-6 space-y-5">
          {/* 공개범위 기본값 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-foreground">공개범위 기본값</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">새 피드를 작성할 때 기본으로 선택될 공개범위입니다.</p>

            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDefaultVisibility(option.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                    defaultVisibility === option.value
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/20 border-border/40 hover:border-primary/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    defaultVisibility === option.value ? 'border-primary' : 'border-border'
                  }`}>
                    {defaultVisibility === option.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className={`font-semibold ${defaultVisibility === option.value ? 'text-primary' : 'text-foreground'}`}>{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={saveDefaultVisibility}
              disabled={saving}
              className="mt-4 w-full py-3 rounded-2xl bg-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? '저장 중...' : '기본값 저장'}
            </button>

            {message && <p className="mt-3 text-sm text-green-700 font-semibold">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </section>

          {/* 차단 목록 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-foreground">차단 목록</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">차단한 사용자는 사람/피드/대화 화면에서 숨겨집니다.</p>

            <div className="space-y-2">
              {blockedProfiles.map((profile) => (
                <div key={profile.user_id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-muted/30">
                  <div>
                    <div className="font-bold text-foreground">{profile.nickname}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{profile.region ?? '지역 정보 없음'}</div>
                  </div>
                  <button
                    onClick={() => unblock(profile.user_id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/60 bg-white text-sm font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    <X size={14} />
                    차단 해제
                  </button>
                </div>
              ))}
              {blockedProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">차단한 사용자가 없어요.</p>
              )}
            </div>
          </section>

          {/* 고객센터 */}
          <section className="bg-white rounded-4xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <HeadphonesIcon size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-foreground">고객센터</h2>
            </div>

            <div className="space-y-3">
              <a
                href="mailto:support@silverlink.local"
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-primary shrink-0" />
                  <div>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">문의 메일</div>
                    <div className="text-xs text-muted-foreground">support@silverlink.local</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted-foreground/50" />
              </a>

              <Link
                href="/forgot"
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <KeyRound size={18} className="text-primary shrink-0" />
                  <div>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">비밀번호 재설정</div>
                    <div className="text-xs text-muted-foreground">로그인 문제가 있을 때 이용해 주세요</div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted-foreground/50" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
