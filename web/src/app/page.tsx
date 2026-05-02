export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MoodLogger from '@/components/MoodLogger'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, region, hobbies')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  // 오늘 기분 로그
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayMood } = await supabase
    .from('mood_logs')
    .select('mood_score')
    .eq('user_id', auth.user.id)
    .eq('log_date', today)
    .maybeSingle()

  // 최근 피드 3개
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, created_at, user_id, profiles(nickname)')
    .eq('visibility', 'all')
    .order('created_at', { ascending: false })
    .limit(3)

  // 추천 그룹 (같은 지역 or 취미 기반, 최대 3개)
  const { data: suggestedGroups } = await supabase
    .from('groups')
    .select('id, title, category, region')
    .eq('region', profile.region)
    .limit(3)

  const MOOD_LABELS: Record<number, string> = {
    1: '매우 힘들어요', 2: '좀 힘들어요', 3: '보통이에요', 4: '좋아요', 5: '매우 좋아요',
  }

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)' }}>WithDay</h1>
        <span style={{ fontSize: 16, color: 'var(--muted)' }}>{profile.nickname}님</span>
      </div>

      {/* 기분 로깅 */}
      <div className="card" style={{ marginBottom: 20 }}>
        {todayMood ? (
          <div>
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 6 }}>오늘의 기분</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {['😢','😔','😐','😊','😄'][todayMood.mood_score - 1]} {MOOD_LABELS[todayMood.mood_score]}
            </div>
          </div>
        ) : (
          <MoodLogger userId={auth.user.id} />
        )}
      </div>

      {/* 추천 그룹 */}
      {suggestedGroups && suggestedGroups.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>내 지역 모임</h2>
            <Link href="/groups" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>전체 보기</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestedGroups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{g.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 4 }}>{g.category} · {g.region}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 최근 피드 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>생활 피드</h2>
          <Link href="/feed" style={{ fontSize: 16, color: 'var(--primary)', textDecoration: 'none' }}>전체 보기</Link>
        </div>
        {recentPosts && recentPosts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPosts.map((p: any) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{p.profiles?.nickname ?? '익명'}</div>
                <div style={{ fontSize: 17, lineHeight: 1.6 }}>{p.content}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
            아직 피드가 없어요.<br />
            <Link href="/feed" style={{ color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>첫 글 남기기</Link>
          </div>
        )}
      </div>
    </div>
  )
}
