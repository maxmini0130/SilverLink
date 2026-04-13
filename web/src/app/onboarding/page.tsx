'use client'

/**
 * 온보딩 화면 — 최초 로그인 후 프로필 설정
 *
 * ⚠️ DB 사전 조건 (Supabase 대시보드에서 실행 필요):
 *   - profiles 테이블: id(uuid PK), nickname, age_band, region_city,
 *     region_district, purposes(text[]), hobbies(text[]), bio, avatar_url,
 *     is_onboarded(bool)
 *   - Storage 버킷: avatars (public)
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  onboardingSchema,
  type OnboardingFormData,
} from '@/lib/validators/onboarding'
import { Button } from '@/components/ui/button'

// ─── 상수 ─────────────────────────────────────

const AGE_BANDS = [
  { value: '60s_early' as const, label: '60대 초반  (60~64세)' },
  { value: '60s_late' as const,  label: '60대 후반  (65~69세)' },
  { value: '70s_early' as const, label: '70대 초반  (70~74세)' },
  { value: '70s_late' as const,  label: '70대 후반  (75~79세)' },
  { value: '80s_plus' as const,  label: '80대 이상' },
]

const HOBBIES = [
  '산책', '등산', '여행', '사진',
  '요리', '음악', '서예', '탁구',
  '독서', '영화', '원예', '바둑',
]

const PURPOSES = [
  {
    value: 'friend' as const,
    label: '친구',
    emoji: '😊',
    description: '함께 시간 보낼 친구',
  },
  {
    value: 'companion' as const,
    label: '말벗',
    emoji: '💬',
    description: '편하게 대화할 상대',
  },
  {
    value: 'activity' as const,
    label: '동행',
    emoji: '🚶',
    description: '함께 다닐 동반자',
  },
  {
    value: 'hobby' as const,
    label: '취미공유',
    emoji: '🎯',
    description: '같은 취미 즐기기',
  },
]

// ─── 폼 ───────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 프로필 사진 (별도 state — Zod 스키마 밖에서 관리)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // 서버 에러
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      hobbies: [],
      purposes: [],
      bio: '',
    },
  })

  const selectedAgeBand = watch('age_band')
  const selectedHobbies = watch('hobbies') ?? []
  const selectedPurposes = watch('purposes') ?? []
  const bioValue = watch('bio') ?? ''

  // ── 사진 선택 핸들러 ──────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('사진 파일은 5MB 이하만 가능합니다')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── 멀티셀렉트 토글 ───────────────────────

  function toggleHobby(hobby: string) {
    const updated = selectedHobbies.includes(hobby)
      ? selectedHobbies.filter((h) => h !== hobby)
      : [...selectedHobbies, hobby]
    setValue('hobbies', updated, { shouldValidate: true })
  }

  function togglePurpose(purpose: OnboardingFormData['purposes'][number]) {
    const updated = selectedPurposes.includes(purpose)
      ? selectedPurposes.filter((p) => p !== purpose)
      : [...selectedPurposes, purpose]
    setValue('purposes', updated, { shouldValidate: true })
  }

  // ── 폼 제출 ───────────────────────────────

  async function onSubmit(data: OnboardingFormData) {
    setSubmitError(null)
    const supabase = createClient()

    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.replace('/login')
        return
      }

      // 1. 프로필 사진 업로드 (Supabase Storage 'avatars' 버킷)
      let avatarUrl: string | null = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${auth.user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (uploadError) {
          // Storage 오류는 치명적이지 않으므로 계속 진행
          console.warn('사진 업로드 실패:', uploadError.message)
        } else {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        }
      }

      // 2. 프로필 저장
      // ⚠️ 아래 컬럼은 Supabase 테이블에 존재해야 합니다
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: auth.user.id,           // PK (auth.users.id 참조)
        nickname: data.nickname,
        age_band: data.age_band,
        region_city: data.region_city,
        region_district: data.region_district,
        purposes: data.purposes,
        hobbies: data.hobbies,      // text[] — 추후 profile_interests로 마이그레이션
        bio: data.bio ?? '',
        avatar_url: avatarUrl,
        is_onboarded: true,
      })

      if (profileError) throw new Error(profileError.message)

      router.replace('/')
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : '저장에 실패했습니다. 다시 시도해주세요.',
      )
    }
  }

  // ─── 렌더 ─────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-12">

        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>
        <p className="text-base text-gray-500 mt-1">
          처음 한 번만 입력하면 됩니다.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-8 space-y-9"
        >

          {/* ── 프로필 사진 ───────────────── */}
          <section className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative focus:outline-none"
              aria-label="프로필 사진 선택"
            >
              {/* 미리보기 or 플레이스홀더 */}
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="프로필 사진 미리보기"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1">
                  <Camera size={26} className="text-gray-400" />
                  <span className="text-xs text-gray-400">사진 추가</span>
                </div>
              )}
              {/* 수정 아이콘 */}
              <div className="absolute bottom-0.5 right-0.5 bg-blue-600 rounded-full p-1.5 shadow">
                <Camera size={13} className="text-white" />
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-sm text-gray-400">선택사항 · 최대 5MB</p>
            {avatarError && (
              <p className="text-sm text-red-500">{avatarError}</p>
            )}
          </section>

          {/* ── 닉네임 ────────────────────── */}
          <section>
            <FieldLabel required>닉네임</FieldLabel>
            <input
              {...register('nickname')}
              placeholder="예: 김철수, 산들바람"
              autoComplete="off"
              className={inputClass(!!errors.nickname)}
            />
            <FieldError message={errors.nickname?.message} />
          </section>

          {/* ── 나이대 ────────────────────── */}
          <section>
            <FieldLabel required>나이대</FieldLabel>
            <div className="flex flex-col gap-2 mt-2">
              {AGE_BANDS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setValue('age_band', value, { shouldValidate: true })
                  }
                  className={[
                    'w-full py-4 px-5 text-left text-base font-medium rounded-xl border-2 transition-colors active:scale-[0.99]',
                    selectedAgeBand === value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <FieldError message={errors.age_band?.message} />
          </section>

          {/* ── 지역 ──────────────────────── */}
          <section>
            <FieldLabel required>지역</FieldLabel>
            <p className="text-sm text-gray-400 mt-1">
              현재 주로 활동하는 지역을 입력해주세요.
            </p>
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <input
                  {...register('region_city')}
                  placeholder="시/도 (예: 서울특별시)"
                  className={inputClass(!!errors.region_city)}
                />
                <FieldError message={errors.region_city?.message} />
              </div>
              <div className="flex-1">
                <input
                  {...register('region_district')}
                  placeholder="구/동 (예: 마포구)"
                  className={inputClass(!!errors.region_district)}
                />
                <FieldError message={errors.region_district?.message} />
              </div>
            </div>
          </section>

          {/* ── 관심사 ────────────────────── */}
          <section>
            <FieldLabel required>
              관심사{' '}
              <span className="text-sm font-normal text-gray-500">
                (1개 이상 선택)
              </span>
            </FieldLabel>
            <div className="flex flex-wrap gap-2 mt-3">
              {HOBBIES.map((hobby) => {
                const isSelected = selectedHobbies.includes(hobby)
                return (
                  <button
                    key={hobby}
                    type="button"
                    onClick={() => toggleHobby(hobby)}
                    className={[
                      'px-4 py-2.5 rounded-full text-base font-medium border-2 transition-colors active:scale-95',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300',
                    ].join(' ')}
                  >
                    {hobby}
                  </button>
                )
              })}
            </div>
            <FieldError message={errors.hobbies?.message} />
          </section>

          {/* ── 관계 목적 ─────────────────── */}
          <section>
            <FieldLabel required>
              어떤 만남을 원하세요?{' '}
              <span className="text-sm font-normal text-gray-500">
                (1개 이상 선택)
              </span>
            </FieldLabel>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {PURPOSES.map(({ value, label, emoji, description }) => {
                const isSelected = selectedPurposes.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => togglePurpose(value)}
                    className={[
                      'p-4 rounded-2xl border-2 text-left transition-colors active:scale-[0.98]',
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-blue-300',
                    ].join(' ')}
                  >
                    <span className="text-3xl leading-none">{emoji}</span>
                    <p
                      className={[
                        'text-base font-bold mt-2',
                        isSelected ? 'text-blue-700' : 'text-gray-900',
                      ].join(' ')}
                    >
                      {label}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                      {description}
                    </p>
                  </button>
                )
              })}
            </div>
            <FieldError message={errors.purposes?.message} />
          </section>

          {/* ── 자기소개 ──────────────────── */}
          <section>
            <FieldLabel>
              자기소개{' '}
              <span className="text-sm font-normal text-gray-500">
                (선택사항)
              </span>
            </FieldLabel>
            <textarea
              {...register('bio')}
              rows={4}
              placeholder="간단히 자신을 소개해 주세요.&#10;예) 사진 찍는 걸 좋아하는 60대입니다. 같이 산책하실 분 환영해요!"
              className={[
                'w-full mt-2 px-4 py-3.5 text-base text-gray-900',
                'border-2 rounded-xl resize-none leading-relaxed',
                'placeholder:text-gray-400',
                'focus:outline-none focus:border-blue-500',
                errors.bio ? 'border-red-400 bg-red-50' : 'border-gray-200',
              ].join(' ')}
            />
            <div className="flex items-start justify-between mt-1.5">
              <FieldError message={errors.bio?.message} />
              <span className="text-sm text-gray-400 ml-auto shrink-0">
                {bioValue.length}/150자
              </span>
            </div>
          </section>

          {/* ── 서버 에러 ─────────────────── */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
              <p className="text-base text-red-600">{submitError}</p>
            </div>
          )}

          {/* ── 제출 버튼 ─────────────────── */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '저장 중…' : '저장하고 시작하기'}
          </Button>

        </form>
      </div>
    </div>
  )
}

// ─── 공통 헬퍼 컴포넌트 ───────────────────────

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="block text-lg font-bold text-gray-900">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-500">
      {message}
    </p>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full mt-2 px-4 py-3.5',
    'text-base text-gray-900 placeholder:text-gray-400',
    'border-2 rounded-xl',
    'focus:outline-none focus:border-blue-500',
    'transition-colors',
    hasError
      ? 'border-red-400 bg-red-50'
      : 'border-gray-200 bg-white',
  ].join(' ')
}
