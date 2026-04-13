import { z } from 'zod'

// ─── 상수 정의 (DB enum과 1:1 대응) ─────────────

export const AGE_BAND_OPTIONS = [
  '60s_early',
  '60s_late',
  '70s_early',
  '70s_late',
  '80s_plus',
] as const

export const PURPOSE_OPTIONS = [
  'friend',
  'companion',
  'activity',
  'hobby',
] as const

// ─── Zod 스키마 ───────────────────────────────

export const onboardingSchema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상 입력해주세요')
    .max(10, '닉네임은 10자 이하로 입력해주세요')
    .trim(),

  age_band: z.enum(AGE_BAND_OPTIONS, {
    message: '나이대를 선택해주세요',
  }),

  region_city: z
    .string()
    .min(2, '시/도를 입력해주세요 (예: 서울특별시)')
    .trim(),

  region_district: z
    .string()
    .min(2, '구/동을 입력해주세요 (예: 마포구)')
    .trim(),

  hobbies: z
    .array(z.string())
    .min(1, '관심사를 1개 이상 선택해주세요'),

  purposes: z
    .array(z.enum(PURPOSE_OPTIONS, { message: '올바른 관계 목적을 선택해주세요' }))
    .min(1, '관계 목적을 1개 이상 선택해주세요'),

  // 선택사항: 빈 문자열도 허용
  bio: z
    .string()
    .max(150, '자기소개는 150자 이하로 입력해주세요')
    .optional()
    .or(z.literal('')),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>
