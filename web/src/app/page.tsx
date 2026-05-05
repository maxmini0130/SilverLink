export const dynamic = 'force-dynamic'

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import MoodLogger from '@/components/MoodLogger'
import { createClient } from '@/lib/supabase/server'

type HomeProfileRow = {
  user_id: string
  nickname: string
  region: string
  hobbies: string[] | null
}

type MoodRow = {
  mood_score: number
}

type ProfileRef = {
  nickname: string | null
}

type RecentPostRow = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: ProfileRef | ProfileRef[] | null
}

type SuggestedGroupRow = {
  id: string
  title: string
  category: string
  region: string
}

type SuggestedPersonRow = {
  user_id: string
  nickname: string
  age_band: string
  region: string
  hobbies: string[] | null
  avatar_url?: string | null
}

type SuggestedPerson = SuggestedPersonRow & {
  score: number
  commonHobbies: string[]
}

type NotificationSummaryRow = {
  id: number
  title: string
  href: string | null
  created_at: string
}

function firstProfile(profile: ProfileRef | ProfileRef[] | null) {
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile
}

function PublicHome() {
  const previews = [
    {
      title: '사람 찾기',
      body: '지역, 관심사, 생활 리듬이 맞는 사람을 먼저 살펴볼 수 있어요.',
    },
    {
      title: '모임',
      body: '부담 없는 만남은 산책, 차 한잔, 동네 모임에서 시작됩니다.',
    },
    {
      title: '생활 피드',
      body: '나의 일상과 생각을 가볍게 나누며 대화의 계기를 만들어요.',
    },
  ]

  return (
    <main className="page" style={{ paddingBottom: 32 }}>
      <section style={{ padding: '28px 0 24px' }}>
        <div style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
          WithDay
        </div>
        <h1 style={{ fontSize: 34, lineHeight: 1.22, fontWeight: 900, marginBottom: 14 }}>
          오늘 좋은 인연을
          <br />
          시작하세요
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.65, marginBottom: 24 }}>
          WithDay는 중장년과 시니어가 안전하게 사람을 만나고, 대화하고, 가까운 모임으로
          자연스럽게 이어질 수 있도록 돕는 서비스입니다.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn-primary" style={{ textDecoration: 'none' }}>
            시작하기
          </Link>
          <Link
            href="/login"
            className="btn-primary"
            style={{
              textDecoration: 'none',
              background: '#fff',
              color: 'var(--primary)',
              border: '1px solid var(--border)',
            }}
          >
            로그인
          </Link>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
        {previews.map((item) => (
          <div key={item.title} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{item.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.55 }}>{item.body}</div>
          </div>
        ))}
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>안전한 관심 표현</div>
        <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          바로 연락처를 주고받기보다 프로필, 관심, 대화, 모임 순서로 천천히 알아갈 수
          있게 설계했습니다.
        </p>
      </section>
    </main>
  )
}

const MOOD_LABELS: Record<number, string> = {
  1: '매우 힘들어요',
  2: '조금 힘들어요',
  3: '보통이에요',
  4: '좋아요',
  5: '매우 좋아요',
}

const MOOD_ICONS = ['😞', '😕', '🙂', '😊', '😄']

export default async function HomePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return <PublicHome />

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, region, hobbies')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const homeProfile = profile as HomeProfileRow

  const today = new Date().toISOString().slice(0, 10)
  const { data: todayMood } = await supabase
    .from('mood_logs')
    .select('mood_score')
    .eq('user_id', auth.user.id)
    .eq('log_date', today)
    .maybeSingle()

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, created_at, user_id, profiles(nickname)')
    .eq('visibility', 'all')
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: allPeople } = await supabase
    .from('profiles')
    .select('user_id, nickname, age_band, region, hobbies, avatar_url')
    .neq('user_id', auth.user.id)
    .limit(30)

  const suggestedPeople: SuggestedPerson[] = ((allPeople ?? []) as SuggestedPersonRow[])
    .map((person) => {
      const hobbies = person.hobbies ?? []
      const commonHobbies = hobbies.filter((hobby) => (homeProfile.hobbies ?? []).includes(hobby))
      return {
        ...person,
        hobbies,
        avatar_url: person.avatar_url ?? null,
        score: (person.region === homeProfile.region ? 10 : 0) + commonHobbies.length,
        commonHobbies,
      }
    })
    .sort((a, b) => b.score - a.score)
    .filter((person) => person.score > 0)
    .slice(0, 3)

  const { data: suggestedGroups } = await supabase
    .from('groups')
    .select('id, title, category, region')
    .eq('region', homeProfile.region)
    .limit(3)

  const { data: unreadNotifications } = await supabase
    .from('notifications')
    .select('id, title, href, created_at')
    .eq('recipient_id', auth.user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  const mood = todayMood as MoodRow | null
  const posts = (recentPosts ?? []) as unknown as RecentPostRow[]
  const groups = (suggestedGroups ?? []) as SuggestedGroupRow[]
  const notifications = (unreadNotifications ?? []) as NotificationSummaryRow[]

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>WithDay</h1>
        <span style={{ fontSize: 16, color: 'var(--muted)' }}>{homeProfile.nickname}님</span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {mood ? (
          <div>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 6 }}>오늘의 기분</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {MOOD_ICONS[mood.mood_score - 1]} {MOOD_LABELS[mood.mood_score]}
            </div>
          </div>
        ) : (
          <MoodLogger userId={auth.user.id} />
        )}
      </div>

      {suggestedPeople.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>이런 분은 어떠세요?</h2>
            <Link href="/people" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>
              더 보기
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestedPeople.map((person) => (
              <Link key={person.user_id} href={`/people/${person.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.nickname} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
                      {person.nickname.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{person.nickname}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 2 }}>
                      {person.age_band}세 · {person.region}
                      {person.commonHobbies.length > 0 && (
                        <span style={{ color: 'var(--primary)', marginLeft: 6 }}>취미 {person.commonHobbies.length}개 일치</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>내 지역 모임</h2>
            <Link href="/groups" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>
              전체 보기
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{group.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 4 }}>
                    {group.category} · {group.region}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>새 알림</h2>
          <Link href="/notifications" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>
            전체 보기
          </Link>
        </div>
        {notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map((item) => (
              <Link key={item.id} href={item.href ?? '/notifications'} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ padding: 16, background: '#eff6ff', borderColor: 'var(--primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{item.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 16 }}>
            확인할 새 알림이 없어요.
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>생활 피드</h2>
          <Link href="/feed" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>
            전체 보기
          </Link>
        </div>
        {posts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map((post) => (
              <div key={post.id} className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
                  {firstProfile(post.profiles)?.nickname ?? '익명'}
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.6 }}>{post.content}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
                  {new Date(post.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
            아직 피드가 없어요
            <br />
            <Link href="/feed" style={{ color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>
              첫 글 남기기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
