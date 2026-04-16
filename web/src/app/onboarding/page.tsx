'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { VISIBILITY_OPTIONS } from '@/lib/visibility'

const AGE_BANDS = ['60-64', '65-69', '70-74', '75-79', '80+'] as const
const HOBBIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구'] as const
const RELATIONSHIP_PURPOSES = ['말벗', '친구', '동네 산책', '취미 동행', '모임 찾기'] as const

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">로딩 중...</div>}>
      <OnboardingPageInner />
    </Suspense>
  )
}

function OnboardingPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('edit') === '1'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState('')
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]>('60-64')
  const [region, setRegion] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [relationshipPurpose, setRelationshipPurpose] =
    useState<(typeof RELATIONSHIP_PURPOSES)[number]>('말벗')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [defaultPostVisibility, setDefaultPostVisibility] = useState('members')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 프로필 있으면 홈으로 (edit 모드 아닐 때)
  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')

      const { data } = await supabase
        .from('profiles')
        .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url,default_post_visibility')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (data) {
        setNickname(data.nickname ?? '')
        setAgeBand(data.age_band ?? '60-64')
        setRegion(data.region ?? '')
        setHobbies(data.hobbies ?? [])
        setRelationshipPurpose(data.relationship_purpose ?? '말벗')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar_url ?? '')
        setDefaultPostVisibility(data.default_post_visibility ?? 'members')
        if (!isEditMode) router.replace('/')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  function toggleHobby(h: string) {
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]))
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)

    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) { router.replace('/login'); return }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)

      setAvatarUrl(publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '사진 업로드에 실패했습니다.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nickname.trim()) return setError('닉네임을 입력해 주세요.')
    if (!region.trim()) return setError('지역을 입력해 주세요. (예: 서울 마포구)')
    if (hobbies.length === 0) return setError('취미를 1개 이상 선택해 주세요.')

    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return router.replace('/login')

      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        nickname: nickname.trim(),
        age_band: ageBand,
        region: region.trim(),
        hobbies,
        relationship_purpose: relationshipPurpose,
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        default_post_visibility: defaultPostVisibility,
      })

      if (error) throw error
      router.replace('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
  const labelClass = "block text-base font-bold text-foreground mb-2"

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">프로필 설정</h1>
          <p className="mt-2 text-muted-foreground font-medium">
            {isEditMode
              ? '내 프로필과 기본 공개범위를 수정해 보세요.'
              : '사람 추천과 프로필 탐색에 쓰일 기본 정보를 입력해 주세요.'}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* 프로필 사진 */}
          <div>
            <div className={labelClass}>프로필 사진</div>
            <div className="flex items-center gap-4 flex-wrap">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="프로필 사진 미리보기"
                  className="w-20 h-20 rounded-full object-cover bg-muted"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-foreground">
                  {nickname.slice(0, 1) || '나'}
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-5 py-3 rounded-full border border-border bg-white font-bold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  {uploadingAvatar ? '업로드 중...' : '사진 선택'}
                </button>
                <p className="mt-2 text-sm text-muted-foreground">JPG, PNG, WEBP · 최대 5MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className={labelClass}>닉네임</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={inputClass}
              placeholder="예: 김철수"
            />
          </div>

          <div>
            <label className={labelClass}>나이대</label>
            <select
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value as (typeof AGE_BANDS)[number])}
              className={inputClass}
            >
              {AGE_BANDS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>지역(구/동)</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputClass}
              placeholder="예: 서울 마포구"
            />
          </div>

          <div>
            <div className={labelClass}>취미 선택 (여러 개 가능)</div>
            <div className="flex flex-wrap gap-2">
              {HOBBIES.map((h) => {
                const active = hobbies.includes(h)
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHobby(h)}
                    className={`px-5 py-3 rounded-full text-base font-bold border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {h}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>관계 목적</label>
            <select
              value={relationshipPurpose}
              onChange={(e) => setRelationshipPurpose(e.target.value as (typeof RELATIONSHIP_PURPOSES)[number])}
              className={inputClass}
            >
              {RELATIONSHIP_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>{purpose}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`${inputClass} min-h-32`}
              placeholder="예: 사진 찍기와 산책을 좋아하고, 편하게 이야기 나눌 분을 찾고 있어요."
            />
          </div>

          <div>
            <label className={labelClass}>기본 공개범위</label>
            <select
              value={defaultPostVisibility}
              onChange={(e) => setDefaultPostVisibility(e.target.value)}
              className={inputClass}
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">새 피드를 작성할 때 기본으로 선택될 공개범위예요.</p>
          </div>

          {error && (
            <p className="px-4 py-3 rounded-xl bg-red-50 text-red-700 font-semibold border border-red-100">
              {error}
            </p>
          )}

          <button
            disabled={loading || uploadingAvatar}
            className="w-full py-4 rounded-2xl bg-primary text-white text-lg font-extrabold shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장하고 시작하기'}
          </button>
        </form>
      </main>

      <AppNav />
    </div>
  )
}
