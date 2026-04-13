import Link from 'next/link'
import { Bell, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UserAvatar from '@/components/common/UserAvatar'
import { AGE_BAND_LABEL, PURPOSE_LABEL, REACTION_META, CATEGORY_EMOJI, CATEGORY_BG } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────

type PersonRow = {
  id: string
  nickname: string
  age_band: string
  region_district: string
  avatar_url: string | null
  purposes: string[]
}

type PostRow = {
  id: string
  content: string
  image_url: string
  created_at: string
  author_id: string
  profiles: {
    nickname: string
    avatar_url: string | null
    region_district: string
  } | null
  post_reactions: { reaction_type: string }[]
}

type GroupRow = {
  id: string
  title: string
  category: string | null
  region_district: string
  max_members: number
  schedule_date: string | null
  group_members: { count: number }[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)  return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

function formatScheduleShort(date: string | null): string {
  if (!date) return '일정 미정'
  return new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
}

// ─────────────────────────────────────────────────────
// 홈 화면 (서버 컴포넌트)
// ─────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient()

  // 1. 현재 사용자 프로필
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('nickname, region_city, region_district')
    .eq('id', user!.id)
    .maybeSingle()

  const myRegionCity = myProfile?.region_city ?? ''

  // 2. 추천 사람 (같은 시/도, 본인 제외, 최대 10명)
  const { data: peopleData } = await supabase
    .from('profiles')
    .select('id, nickname, age_band, region_district, avatar_url, purposes')
    .eq('is_onboarded', true)
    .eq('region_city', myRegionCity)
    .neq('id', user!.id)
    .limit(10)

  const people = (peopleData ?? []) as PersonRow[]

  // 3. 최신 피드 (공개 게시물, 최대 5개)
  const { data: postsData } = await supabase
    .from('posts')
    .select(
      `id, content, image_url, created_at, author_id,
       profiles!author_id(nickname, avatar_url, region_district),
       post_reactions(reaction_type)`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const posts = (postsData ?? []) as unknown as PostRow[]

  // 4. 추천 모임 (일정 있는 것 우선, 최대 8개)
  const { data: groupsData } = await supabase
    .from('groups')
    .select('id, title, category, region_district, max_members, schedule_date, group_members(count)')
    .order('schedule_date', { ascending: true, nullsFirst: false })
    .limit(8)

  const groups = (groupsData ?? []) as GroupRow[]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── 상단 헤더 ─────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">실버링크</h1>
          {myProfile?.region_district && (
            <p className="text-xs text-gray-400 flex items-center gap-0.5 -mt-0.5">
              <MapPin size={10} />
              {myProfile.region_district}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="알림" className="relative">
          <Bell size={22} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </header>

      <div className="px-4 pt-5 space-y-8 pb-4">

        {/* ── 섹션 1: 추천 사람 ─────────────── */}
        <section>
          <SectionHeader
            title={myRegionCity ? `${myRegionCity} 이웃` : '오늘의 추천 사람'}
            href="/people"
          />

          {people.length === 0 ? (
            <div className="mt-3 py-8 bg-white rounded-2xl flex flex-col items-center gap-2 text-center">
              <p className="text-base text-gray-400">같은 지역 이웃이 아직 없어요.</p>
              <Link href="/people" className="text-sm text-blue-500 font-medium">
                전체 사람 보기
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mt-3">
              {people.map((person) => (
                <Link key={person.id} href={`/people/${person.id}`} className="flex-none w-36">
                  <Card className="p-4 active:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <UserAvatar
                        nickname={person.nickname}
                        avatarUrl={person.avatar_url}
                        size="lg"
                      />
                      <div className="text-center">
                        <p className="text-base font-bold text-gray-900 truncate max-w-full">
                          {person.nickname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {AGE_BAND_LABEL[person.age_band] ?? person.age_band}
                        </p>
                        <p className="text-sm text-gray-400">{person.region_district}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {person.purposes.slice(0, 2).map((p) => (
                          <Badge key={p} variant="default" className="text-xs px-2 py-0.5">
                            {PURPOSE_LABEL[p] ?? p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 섹션 2: 최신 피드 ─────────────── */}
        <section>
          <SectionHeader title="주변 새 피드" href="/feed" />

          {posts.length === 0 ? (
            <div className="mt-3 py-8 bg-white rounded-2xl flex flex-col items-center gap-2 text-center">
              <p className="text-base text-gray-400">아직 올라온 피드가 없어요.</p>
              <Link href="/feed/new" className="text-sm text-blue-500 font-medium">
                첫 글 작성하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3 mt-3">
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  {/* 작성자 */}
                  <CardContent className="flex items-center gap-3 pt-4 pb-3">
                    <UserAvatar
                      nickname={post.profiles?.nickname ?? '?'}
                      avatarUrl={post.profiles?.avatar_url ?? null}
                      size="md"
                    />
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {post.profiles?.nickname ?? '알 수 없음'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {post.profiles?.region_district} · {timeAgo(post.created_at)}
                      </p>
                    </div>
                  </CardContent>

                  {/* 사진 */}
                  <div className="w-full h-52 bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt="피드 사진"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 본문 */}
                  <CardContent className="py-3">
                    <p className="text-base text-gray-800 leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
                  </CardContent>

                  {/* 반응 수 (인터랙션은 /feed 페이지에서) */}
                  <div className="flex border-t border-gray-100 px-1">
                    {REACTION_META.map(({ type, emoji, label }) => {
                      const count = post.post_reactions.filter(
                        (r) => r.reaction_type === type,
                      ).length
                      return (
                        <div
                          key={type}
                          className="flex-1 flex flex-col items-center py-2.5 gap-0.5"
                          aria-label={label}
                        >
                          <span className="text-base leading-none">{emoji}</span>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {count > 0 ? count : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              ))}

              <Link
                href="/feed"
                className="block text-center text-sm font-medium text-blue-500 py-2"
              >
                피드 더 보기
              </Link>
            </div>
          )}
        </section>

        {/* ── 섹션 3: 추천 모임 ─────────────── */}
        <section>
          <SectionHeader title="추천 모임" href="/groups" />

          {groups.length === 0 ? (
            <div className="mt-3 py-8 bg-white rounded-2xl flex flex-col items-center gap-2 text-center">
              <p className="text-base text-gray-400">아직 모임이 없어요.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mt-3">
              {groups.map((group) => {
                const category = group.category ?? '기타'
                const emoji = CATEGORY_EMOJI[category] ?? '🌟'
                const bgColor = CATEGORY_BG[category] ?? 'bg-pink-100'
                const memberCount = group.group_members?.[0]?.count ?? 0
                const isFull = memberCount >= group.max_members

                return (
                  <Link key={group.id} href={`/groups/${group.id}`} className="flex-none w-44">
                    <Card className="overflow-hidden active:bg-gray-50 transition-colors">
                      <div className={`${bgColor} h-20 flex items-center justify-center`}>
                        <span className="text-4xl">{emoji}</span>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                          {group.title}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          📍 {group.region_district}
                        </p>
                        <p className="text-sm text-gray-400">
                          📅 {formatScheduleShort(group.schedule_date)}
                        </p>
                        <p
                          className={`text-sm font-semibold mt-1 ${
                            isFull ? 'text-red-500' : 'text-blue-600'
                          }`}
                        >
                          👥 {memberCount}/{group.max_members}명
                          {isFull && ' · 마감'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

// ─── 섹션 헤더 ───────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <Link
        href={href}
        className="text-sm font-medium text-blue-500 py-1 px-1 active:opacity-70"
      >
        더보기
      </Link>
    </div>
  )
}
