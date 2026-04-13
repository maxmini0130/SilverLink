'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import UserAvatar from '@/components/common/UserAvatar'

// ─────────────────────────────────────────────────────
// ⚠️ 더미 데이터 — 실제 Supabase API 연결 전 목업용
// ─────────────────────────────────────────────────────

export type RelationStatus = 'none' | 'sent' | 'mutual' | 'friend'

export type DummyPerson = {
  id: string
  nickname: string
  ageBand: string
  regionCity: string
  regionDistrict: string
  avatarUrl: string | null
  purposes: string[]
  hobbies: string[]
  bio: string
  feedColors: string[]
  relationStatus: RelationStatus
}

export const DUMMY_PEOPLE: DummyPerson[] = [
  {
    id: '1',
    nickname: '산들바람',
    ageBand: '60대 초반',
    regionCity: '서울특별시',
    regionDistrict: '마포구',
    avatarUrl: null,
    purposes: ['친구', '말벗'],
    hobbies: ['산책', '사진', '독서'],
    bio: '사진 찍는 걸 좋아하는 60대입니다. 주말마다 한강 산책을 해요. 같이 걸으면서 대화할 분 환영합니다!',
    feedColors: ['bg-orange-100', 'bg-blue-100', 'bg-green-100', 'bg-pink-100', 'bg-yellow-100', 'bg-purple-100'],
    relationStatus: 'none',
  },
  {
    id: '2',
    nickname: '햇살가득',
    ageBand: '60대 후반',
    regionCity: '서울특별시',
    regionDistrict: '서대문구',
    avatarUrl: null,
    purposes: ['말벗', '취미공유'],
    hobbies: ['요리', '음악', '영화'],
    bio: '집에서 요리하는 걸 즐겨요. 좋아하는 음악을 들으며 천천히 생활하고 있습니다.',
    feedColors: ['bg-yellow-100', 'bg-red-100', 'bg-green-100', 'bg-blue-100'],
    relationStatus: 'sent',
  },
  {
    id: '3',
    nickname: '파란하늘',
    ageBand: '70대 초반',
    regionCity: '서울특별시',
    regionDistrict: '은평구',
    avatarUrl: null,
    purposes: ['친구', '동행'],
    hobbies: ['등산', '사진', '여행'],
    bio: '북한산 근처에 살아서 자주 등산합니다. 같이 산 오르실 분 계시면 좋겠어요.',
    feedColors: ['bg-blue-100', 'bg-green-100', 'bg-gray-100'],
    relationStatus: 'mutual',
  },
  {
    id: '4',
    nickname: '꽃내음',
    ageBand: '60대 초반',
    regionCity: '서울특별시',
    regionDistrict: '강서구',
    avatarUrl: null,
    purposes: ['취미공유', '친구'],
    hobbies: ['원예', '요리', '독서'],
    bio: '베란다에서 꽃과 채소를 키우고 있어요. 식물 좋아하시는 분들과 이야기 나누고 싶어요.',
    feedColors: ['bg-green-100', 'bg-pink-100', 'bg-yellow-100', 'bg-green-200'],
    relationStatus: 'none',
  },
  {
    id: '5',
    nickname: '늦가을',
    ageBand: '70대 후반',
    regionCity: '서울특별시',
    regionDistrict: '동작구',
    avatarUrl: null,
    purposes: ['말벗'],
    hobbies: ['서예', '바둑', '독서'],
    bio: '서예를 30년째 하고 있습니다. 조용히 차 마시며 대화할 분을 찾고 있어요.',
    feedColors: ['bg-amber-100', 'bg-stone-100', 'bg-gray-100'],
    relationStatus: 'none',
  },
  {
    id: '6',
    nickname: '봄바람',
    ageBand: '60대 후반',
    regionCity: '서울특별시',
    regionDistrict: '마포구',
    avatarUrl: null,
    purposes: ['동행', '친구'],
    hobbies: ['산책', '여행', '탁구'],
    bio: '탁구 동호회 회원입니다. 여행도 좋아해서 매년 국내 여행을 꼭 다녀요.',
    feedColors: ['bg-teal-100', 'bg-blue-100', 'bg-orange-100', 'bg-green-100'],
    relationStatus: 'friend',
  },
]

// 지역 필터 옵션 (더미 기준)
const REGION_FILTERS = ['전체', '마포구', '서대문구', '은평구', '강서구', '동작구']

// ─────────────────────────────────────────────────────
// 사람 탐색 목록 페이지
// ─────────────────────────────────────────────────────

export default function PeoplePage() {
  const [selectedRegion, setSelectedRegion] = useState('전체')
  // 관심 보낸 사람 ID 목록 (더미 — API 연결 시 relationship_requests 테이블로 대체)
  const [sentSet, setSentSet] = useState<Set<string>>(
    () => new Set(DUMMY_PEOPLE.filter(p => p.relationStatus === 'sent').map(p => p.id))
  )

  const filtered =
    selectedRegion === '전체'
      ? DUMMY_PEOPLE
      : DUMMY_PEOPLE.filter((p) => p.regionDistrict === selectedRegion)

  function handleSendInterest(id: string) {
    setSentSet((prev) => new Set([...prev, id]))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <h1 className="text-xl font-bold text-gray-900">사람 찾기</h1>
      </header>

      {/* 지역 필터 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {REGION_FILTERS.map((region) => {
            const isActive = selectedRegion === region
            return (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={[
                  'flex-none px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300',
                ].join(' ')}
              >
                {region}
              </button>
            )
          })}
        </div>
      </div>

      {/* 결과 수 */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500">
          {filtered.length}명
        </p>
      </div>

      {/* 사람 카드 목록 */}
      <div className="px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState region={selectedRegion} />
        ) : (
          filtered.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              hasSent={
                sentSet.has(person.id) ||
                person.relationStatus === 'mutual' ||
                person.relationStatus === 'friend'
              }
              relationStatus={
                sentSet.has(person.id) && person.relationStatus === 'none'
                  ? 'sent'
                  : person.relationStatus
              }
              onSendInterest={() => handleSendInterest(person.id)}
            />
          ))
        )}
      </div>

    </div>
  )
}

// ─── 사람 카드 ────────────────────────────────────────

function PersonCard({
  person,
  hasSent,
  relationStatus,
  onSendInterest,
}: {
  person: DummyPerson
  hasSent: boolean
  relationStatus: RelationStatus
  onSendInterest: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 아바타 → 프로필 이동 */}
          <Link href={`/people/${person.id}`} className="shrink-0">
            <UserAvatar
              nickname={person.nickname}
              avatarUrl={person.avatarUrl}
              size="lg"
            />
          </Link>

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0">
            <Link href={`/people/${person.id}`} className="block">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 truncate">
                  {person.nickname}
                </span>
                <span className="text-sm text-gray-500 shrink-0">
                  {person.ageBand}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-0.5 text-sm text-gray-400">
                <MapPin size={13} />
                <span>{person.regionDistrict}</span>
              </div>
            </Link>

            {/* 관계 목적 태그 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {person.purposes.map((p) => (
                <Badge key={p} variant="success">{p}</Badge>
              ))}
              {person.hobbies.slice(0, 2).map((h) => (
                <Badge key={h} variant="default">{h}</Badge>
              ))}
              {person.hobbies.length > 2 && (
                <Badge variant="secondary">+{person.hobbies.length - 2}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* 관심 보내기 버튼 */}
        <div className="mt-4">
          <RelationButton
            status={relationStatus}
            onSendInterest={onSendInterest}
            personId={person.id}
            compact
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 관계 버튼 (목록 + 상세 공용) ─────────────────────

export function RelationButton({
  status,
  onSendInterest,
  personId,
  compact = false,
}: {
  status: RelationStatus
  onSendInterest: () => void
  personId: string
  compact?: boolean
}) {
  const size = compact ? 'sm' : 'lg'

  if (status === 'none') {
    return (
      <Button size={size} className="w-full" onClick={onSendInterest}>
        💗 관심 보내기
      </Button>
    )
  }

  if (status === 'sent') {
    return (
      <Button size={size} variant="secondary" className="w-full" disabled>
        관심 보냄 ✓
      </Button>
    )
  }

  // mutual or friend
  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center justify-center rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm">
        {status === 'friend' ? '👥 1촌' : '💕 상호관심'}
      </div>
      <Button
        size={size}
        className="flex-1"
        asChild
      >
        <Link href={`/chats?with=${personId}`}>대화하기</Link>
      </Button>
    </div>
  )
}

// ─── 빈 상태 ─────────────────────────────────────────

function EmptyState({ region }: { region: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <span className="text-5xl">🔍</span>
      <p className="text-lg font-medium text-gray-700">
        {region} 근처에 아직 회원이 없어요
      </p>
      <p className="text-base text-gray-400">
        다른 지역을 선택해보세요
      </p>
    </div>
  )
}
