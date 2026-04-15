import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname, region, hobbies, relationship_purpose')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocker_user_id,blocked_user_id')
    .or(`blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${auth.user.id}`)

  const blockedIds = new Set(
    (blockRows ?? []).map((row) =>
      row.blocker_user_id === auth.user.id ? row.blocked_user_id : row.blocker_user_id
    )
  )

  const { data: recommendedPeople } = await supabase
    .from('profiles')
    .select('user_id, nickname, region, relationship_purpose, hobbies')
    .neq('user_id', auth.user.id)
    .limit(24)

  const { data: recommendedGroups } = await supabase
    .from('groups')
    .select('id, title, region, category, created_at')
    .limit(24)

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, image_url, created_at, user_id, visibility')
    .order('created_at', { ascending: false })
    .limit(24)

  const recentAuthorIds = Array.from(
    new Set((recentPosts ?? []).map((post) => post.user_id).filter((id) => !blockedIds.has(id)))
  )
  const { data: recentPostProfiles } =
    recentAuthorIds.length > 0
      ? await supabase
          .from('profiles')
          .select('user_id, nickname')
          .in('user_id', recentAuthorIds)
      : { data: [] as Array<{ user_id: string; nickname: string }> }

  const recentProfileMap = new Map((recentPostProfiles ?? []).map((item) => [item.user_id, item.nickname]))

  const hobbySet = new Set(profile.hobbies ?? [])
  const peopleCards = (recommendedPeople ?? [])
    .filter((person) => !blockedIds.has(person.user_id))
    .map((person) => ({
      ...person,
      score:
        (person.region && profile.region && person.region === profile.region ? 2 : 0) +
        ((person.hobbies ?? []).filter((hobby: string) => hobbySet.has(hobby)).length || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const groupCards = (recommendedGroups ?? [])
    .map((group) => ({
      ...group,
      score:
        (group.region && profile.region && group.region === profile.region ? 2 : 0) +
        ((profile.hobbies ?? []).includes(group.category) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const postCards = (recentPosts ?? [])
    .filter((post) => !blockedIds.has(post.user_id))
    .filter((post) => {
      if (post.user_id === auth.user.id) return true
      if (post.visibility === 'members') return true
      return true
    })
    .slice(0, 3)

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>SilverLink</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>안녕하세요, {profile.nickname}님</p>
      <AppNav />

      {/* 1순위: 추천 사람 */}
      <section style={{ marginTop: 20, padding: 20, borderRadius: 20, border: '1px solid #e7e5e4', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>지금 만나볼 만한 사람</div>
            <div style={{ marginTop: 4, color: '#57534e', fontSize: 14 }}>
              {profile.region ? `${profile.region} 근처` : '내 주변'}{profile.relationship_purpose ? ` · ${profile.relationship_purpose} 목적` : ''}
            </div>
          </div>
          <Link href="/people" style={{ textDecoration: 'underline', color: '#57534e', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            더 보기
          </Link>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {peopleCards.map((person) => (
            <Link
              key={person.user_id}
              href={`/people/${person.user_id}`}
              style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f4', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{person.nickname}</div>
              <div style={{ color: '#57534e', marginTop: 4, fontSize: 14 }}>
                {[person.region, person.relationship_purpose].filter(Boolean).join(' · ') || '프로필 준비 중'}
              </div>
            </Link>
          ))}
          {peopleCards.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 추천할 사람이 없어요.</div>
          )}
        </div>
      </section>

      {/* 2순위: 최근 피드 */}
      <section style={{ marginTop: 16, padding: 20, borderRadius: 20, border: '1px solid #e7e5e4', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>최근 올라온 피드</div>
          <Link href="/posts" style={{ textDecoration: 'underline', color: '#57534e', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            더 보기
          </Link>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {postCards.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f4', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{recentProfileMap.get(post.user_id) ?? '사용자'}</div>
              <div style={{ marginTop: 4, color: '#57534e', fontSize: 14 }}>
                {post.content?.slice(0, 80) || (post.image_url ? '사진을 올렸어요.' : '새 피드를 작성했어요.')}
              </div>
            </Link>
          ))}
          {postCards.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 올라온 피드가 없어요.</div>
          )}
        </div>
      </section>

      {/* 3순위: 추천 모임 */}
      <section style={{ marginTop: 16, padding: 20, borderRadius: 20, border: '1px solid #e7e5e4', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>함께할 모임</div>
          <Link href="/groups" style={{ textDecoration: 'underline', color: '#57534e', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            더 보기
          </Link>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {groupCards.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f5f5f4', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ fontWeight: 600, fontSize: 16 }}>{group.title}</div>
              <div style={{ color: '#57534e', marginTop: 4, fontSize: 14 }}>
                {[group.category, group.region].filter(Boolean).join(' · ')}
              </div>
            </Link>
          ))}
          {groupCards.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 추천할 모임이 없어요.</div>
          )}
        </div>
      </section>
    </div>
  )
}
