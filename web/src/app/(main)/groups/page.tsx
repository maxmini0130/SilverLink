import Link from 'next/link'
import { ChevronRight, MapPin, Calendar, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_EMOJI, CATEGORY_BG } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 모임 목록 (서버 컴포넌트)
// ─────────────────────────────────────────────────────

type GroupRow = {
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
  group_members: { count: number }[]
}

function formatSchedule(date: string | null, time: string | null): string {
  if (!date) return '일정 미정'
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  if (!time) return dateStr
  // time is 'HH:MM:SS'
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour < 12 ? '오전' : '오후'
  const displayHour = hour <= 12 ? hour : hour - 12
  return `${dateStr} ${ampm} ${displayHour}:${m}`
}

export default async function GroupsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('groups')
    .select(
      'id, title, category, region_city, region_district, description, max_members, schedule_date, schedule_time, location, group_members(count)',
    )
    .order('schedule_date', { ascending: true, nullsFirst: false })
    .limit(50)

  const groups = (data ?? []) as GroupRow[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <h1 className="text-xl font-bold text-gray-900">모임</h1>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {groups.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🌱</span>
            <p className="text-base text-gray-500">아직 모임이 없어요.</p>
            <p className="text-sm text-gray-400">운영팀이 곧 모임을 만들 예정이에요.</p>
          </div>
        )}

        {groups.map((g) => {
          const memberCount = g.group_members?.[0]?.count ?? 0
          const category = g.category ?? '기타'
          const emoji = CATEGORY_EMOJI[category] ?? '🌟'
          const bgColor = CATEGORY_BG[category] ?? 'bg-pink-100'
          const isFull = memberCount >= g.max_members
          const scheduleText = formatSchedule(g.schedule_date, g.schedule_time)

          return (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="overflow-hidden active:bg-gray-50 transition-colors">
                <div className="flex">
                  {/* 카테고리 이모지 */}
                  <div className={`${bgColor} w-24 flex-none flex items-center justify-center`}>
                    <span className="text-4xl">{emoji}</span>
                  </div>

                  {/* 정보 */}
                  <CardContent className="flex-1 py-3 px-4 flex flex-col justify-between min-h-[96px]">
                    <div>
                      <Badge variant="secondary" className="mb-1.5 text-xs">
                        {category}
                      </Badge>
                      <p className="text-base font-bold text-gray-900 leading-tight line-clamp-1">
                        {g.title}
                      </p>
                      {g.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {g.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {g.region_district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {scheduleText}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        <span
                          className={
                            isFull ? 'text-red-500 font-semibold' : 'text-blue-500 font-semibold'
                          }
                        >
                          {memberCount}/{g.max_members}명
                        </span>
                        {isFull && <span className="text-red-400">· 마감</span>}
                      </span>
                    </div>
                  </CardContent>

                  <div className="flex items-center pr-3">
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
