// ─── 공통 레이블 매핑 ──────────────────────────────────
// DB enum 값 → 한국어 표시용

export const AGE_BAND_LABEL: Record<string, string> = {
  '50s_late':  '50대 후반',
  '60s_early': '60대 초반',
  '60s_late':  '60대 후반',
  '70s_early': '70대 초반',
  '70s_late':  '70대 후반',
  '80s_plus':  '80대 이상',
}

export const PURPOSE_LABEL: Record<string, string> = {
  friend:    '친구',
  companion: '말벗',
  activity:  '동행',
  hobby:     '취미공유',
}

export const VISIBILITY_LABEL: Record<string, string> = {
  only_me:      '나만 보기',
  friends_only: '1촌만',
  same_region:  '같은 지역',
  same_group:   '모임 멤버',
  all_members:  '전체 공개',
}

export const REACTION_META = [
  { type: 'like',          emoji: '👍', label: '좋아요'      },
  { type: 'hello',         emoji: '😊', label: '반가워요'     },
  { type: 'similar_hobby', emoji: '🎯', label: '취미 비슷해요' },
  { type: 'want_to_go',    emoji: '🌿', label: '가보고싶어요'  },
] as const

export type ReactionType = typeof REACTION_META[number]['type']

// 모임 카테고리 이모지
export const CATEGORY_EMOJI: Record<string, string> = {
  운동: '🏃', 등산: '⛰️', 사진: '📷', 요리: '🍳',
  음악: '🎵', 독서: '📚', 여행: '✈️', 바둑: '♟️',
  원예: '🌿', 탁구: '🏓', 기타: '🌟',
}

export const CATEGORY_BG: Record<string, string> = {
  운동: 'bg-green-100',  등산: 'bg-emerald-100', 사진: 'bg-purple-100',
  요리: 'bg-yellow-100', 음악: 'bg-blue-100',   독서: 'bg-indigo-100',
  여행: 'bg-orange-100', 바둑: 'bg-gray-100',   원예: 'bg-lime-100',
  탁구: 'bg-cyan-100',   기타: 'bg-pink-100',
}
