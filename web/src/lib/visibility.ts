export type Visibility = 'private' | 'friends' | 'interested' | 'same_group' | 'members'

export type VisibilityOption = {
  value: Visibility
  label: string
  desc: string
}

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'private', label: '나만 보기', desc: '나 혼자만 볼 수 있어요' },
  { value: 'friends', label: '1촌만 보기', desc: '1촌 관계인 분들에게만 보여요' },
  { value: 'interested', label: '관심 있는 사람만 보기', desc: '서로 관심을 주고받은 분들에게만 보여요' },
  { value: 'same_group', label: '같은 모임만 보기', desc: '같은 모임에 속한 분들에게만 보여요' },
  { value: 'members', label: '전체 회원 보기', desc: '가입한 모든 회원에게 보여요' },
]

export const DEFAULT_VISIBILITY: Visibility = 'members'

export function visibilityLabel(value: string | null | undefined): string {
  if (!value) return ''
  return VISIBILITY_OPTIONS.find((opt) => opt.value === value)?.label ?? value
}

export function visibilityDesc(value: string | null | undefined): string {
  if (!value) return ''
  return VISIBILITY_OPTIONS.find((opt) => opt.value === value)?.desc ?? ''
}

export function isVisibility(value: unknown): value is Visibility {
  return typeof value === 'string' && VISIBILITY_OPTIONS.some((opt) => opt.value === value)
}
