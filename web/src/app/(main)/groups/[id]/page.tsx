'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MapPin, Calendar, Users, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { joinGroup, leaveGroup } from '@/app/actions/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UserAvatar from '@/components/common/UserAvatar'
import { CATEGORY_EMOJI, CATEGORY_BG } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────

type GroupDetail = {
  id: string
  title: string
  category: string | null
  region_city: string
  region_district: string
  description: string
  max_members: number
  schedule_date: string | null
  schedule_time: string | null
  location: string | null
  owner_user_id: string
}

type MemberRow = {
  user_id: string
  role: string
  profiles: {
    nickname: string
    avatar_url: string | null
    age_band: string
  } | null
}

function formatSchedule(date: string | null, time: string | null): string {
  if (!date) return '일정 미정'
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
  if (!time) return dateStr
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour <= 12 ? hour : hour - 12
  return `${dateStr} ${ampm} ${displayHour}:${m}`
}

// ─────────────────────────────────────────────────────
// 모임 상세 페이지
// ─────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isMember, setIsMember] = useState(false)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id ?? null
      setMyUserId(userId)

      const { data: g, error: gerr } = await supabase
        .from('groups')
        .select(
          'id, title, category, region_city, region_district, description, max_members, schedule_date, schedule_time, location, owner_user_id',
        )
        .eq('id', id)
        .maybeSingle()

      if (gerr) { setError(gerr.message); setLoading(false); return }
      if (!g)   { setLoading(false); return }
      setGroup(g as GroupDetail)

      const { data: mems } = await supabase
        .from('group_members')
        .select('user_id, role, profiles(nickname, avatar_url, age_band)')
        .eq('group_id', id)

      const rows = (mems ?? []) as unknown as MemberRow[]
      setMembers(rows)
      setIsMember(!!rows.find((m) => m.user_id === userId))
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleJoin() {
    startTransition(async () => {
      setError(null)
      const result = await joinGroup(id)
      if (result.error) { setError(result.error); return }
      setIsMember(true)
      // 멤버 목록 갱신 (실제 profile 데이터는 서버에서 가져오므로 페이지 리프레시 유도)
      window.location.reload()
    })
  }

  function handleLeave() {
    if (!confirm(`모임에서 탈퇴할까요?`)) return
    startTransition(async () => {
      setError(null)
      const result = await leaveGroup(id)
      if (result.error) { setError(result.error); return }
      setIsMember(false)
      setMembers((prev) => prev.filter((m) => m.user_id !== myUserId))
    })
  }

  // ── 로딩 / 에러 상태 ──

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">🤔</span>
        <p className="text-lg font-medium text-gray-700">모임을 찾을 수 없어요.</p>
        <Button variant="outline" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    )
  }

  const category = group.category ?? '기타'
  const emoji = CATEGORY_EMOJI[category] ?? '🌟'
  const bgColor = CATEGORY_BG[category] ?? 'bg-pink-100'
  const memberCount = members.length
  const isFull = memberCount >= group.max_members
  const isOwner = myUserId === group.owner_user_id
  const scheduleText = formatSchedule(group.schedule_date, group.schedule_time)

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-32">

        {/* 상단 바 */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-2 h-14 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="뒤로">
            <ChevronLeft size={26} />
          </Button>
          <h1 className="ml-1 text-lg font-bold text-gray-900 truncate">{group.title}</h1>
        </header>

        {/* 커버 이미지 */}
        <div className={`${bgColor} h-44 flex items-center justify-center`}>
          <span className="text-8xl">{emoji}</span>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white px-5 pt-5 pb-6">
          <Badge variant="secondary" className="mb-2">{category}</Badge>
          <h2 className="text-xl font-bold text-gray-900">{group.title}</h2>

          <div className="mt-4 space-y-2.5 text-base text-gray-600">
            <div className="flex items-start gap-2.5">
              <MapPin size={17} className="text-gray-400 flex-none mt-0.5" />
              <span>
                {group.region_city} {group.region_district}
                {group.location && (
                  <span className="text-sm text-gray-400 ml-1">· {group.location}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar size={17} className="text-gray-400 flex-none" />
              <span>{scheduleText}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users size={17} className="text-gray-400 flex-none" />
              <span>
                <span className={isFull ? 'text-red-500 font-bold' : 'text-blue-600 font-bold'}>
                  {memberCount}
                </span>
                <span className="text-gray-400">/{group.max_members}명</span>
                {isFull && (
                  <span className="ml-2 text-sm font-medium text-red-500">· 정원 마감</span>
                )}
              </span>
            </div>
          </div>

          {group.description && (
            <p className="mt-4 text-base text-gray-700 leading-relaxed">{group.description}</p>
          )}
        </div>

        {/* 참여자 목록 */}
        <div className="mt-2 bg-white px-5 pt-5 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            참여자 <span className="text-blue-600">{memberCount}</span>명
          </h3>

          {members.length === 0 ? (
            <p className="text-sm text-gray-400">아직 참여자가 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-5">
              {members.map((m) => (
                <div key={m.user_id} className="flex flex-col items-center gap-1.5 w-14">
                  <UserAvatar
                    nickname={m.profiles?.nickname ?? '?'}
                    avatarUrl={m.profiles?.avatar_url ?? null}
                    size="md"
                  />
                  <span className="text-xs text-gray-600 text-center w-full truncate">
                    {m.profiles?.nickname ?? '멤버'}
                  </span>
                  {m.role === 'owner' && (
                    <span className="text-xs text-blue-500 font-medium -mt-1">주최자</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-red-50 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* 하단 액션 바 */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 max-w-lg mx-auto">
        {isMember ? (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => router.push(`/groups/${id}/chat`)}
            >
              <MessageSquare size={18} className="mr-2" />
              채팅방 들어가기
            </Button>
            {!isOwner && (
              <Button
                variant="outline"
                className="text-gray-500 px-5"
                onClick={handleLeave}
                disabled={isPending}
              >
                탈퇴
              </Button>
            )}
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={isPending || isFull}
          >
            {isFull ? '정원이 다 찼어요' : isPending ? '참여 중...' : '모임 참여하기'}
          </Button>
        )}
      </div>
    </>
  )
}
