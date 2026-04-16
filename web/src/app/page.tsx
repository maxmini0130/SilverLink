import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { SilverButton } from '@/components/common/silver-button'
import { SectionHeader } from '@/components/common/section-header'
import { SectionCard } from '@/components/common/section-card'
import { User, Image as ImageIcon, Users, ChevronRight } from 'lucide-react'

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

  // 차단 목록 조회
  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocker_user_id,blocked_user_id')
    .or(`blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${auth.user.id}`)

  const blockedIds = new Set(
    (blockRows ?? []).map((row) =>
      row.blocker_user_id === auth.user.id ? row.blocked_user_id : row.blocker_user_id
    )
  )

  // 데이터 로드
  const [recommendedPeople, recommendedGroups, recentPosts] = await Promise.all([
    supabase.from('profiles').select('user_id, nickname, region, relationship_purpose, hobbies, avatar_url').neq('user_id', auth.user.id).limit(10),
    supabase.from('groups').select('id, title, region, category, created_at').limit(10),
    supabase.from('posts').select('id, content, image_url, created_at, user_id, visibility').order('created_at', { ascending: false }).limit(10)
  ])

  // 피드 작성자 프로필 조회
  const postUserIds = [...new Set((recentPosts.data ?? []).map((p) => p.user_id))]
  const { data: postAuthors } = postUserIds.length > 0
    ? await supabase.from('profiles').select('user_id, nickname, avatar_url').in('user_id', postUserIds)
    : { data: [] }
  const postAuthorMap = new Map((postAuthors ?? []).map((p) => [p.user_id, p]))

  // 필터링 및 점수 계산 로직
  const hobbySet = new Set(profile.hobbies ?? [])
  const peopleCards = (recommendedPeople.data ?? [])
    .filter((person) => !blockedIds.has(person.user_id))
    .map((person) => ({
      ...person,
      score: (person.region === profile.region ? 2 : 0) + ((person.hobbies ?? []).filter((h: string) => hobbySet.has(h)).length),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const groupCards = (recommendedGroups.data ?? [])
    .map((group) => ({
      ...group,
      score: (group.region === profile.region ? 2 : 0) + (profile.hobbies?.includes(group.category) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const postCards = (recentPosts.data ?? [])
    .filter((post) => !blockedIds.has(post.user_id))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">SilverLink</h1>
          <p className="mt-2 text-muted-foreground font-medium">
            반가워요, <span className="text-foreground">{profile.nickname}</span>님
          </p>
        </header>

        <AppNav />

        <div className="space-y-8 mt-8">
          {/* 1. 추천 사람 */}
          <section>
            <SectionHeader
              title="지금 만나볼 만한 사람"
              subtitle={`${profile.region ? `${profile.region} 근처` : '내 주변'} • ${profile.relationship_purpose || '새로운 인연'}`}
              moreHref="/people"
            />
            
            <div className="grid gap-4">
              {peopleCards.map((person) => (
                <Link key={person.user_id} href={`/people/${person.user_id}`} className="group">
                  <article className="bg-white p-5 rounded-[24px] border border-border/50 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt={person.nickname} className="w-14 h-14 rounded-full object-cover bg-muted" />
                    ) : (
                      <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors font-bold text-xl">
                        {person.nickname.slice(0, 1)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{person.nickname}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {[person.region, person.relationship_purpose].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground/50" size={20} />
                  </article>
                </Link>
              ))}
            </div>
          </section>

          {/* 2. 최근 피드 */}
          <section>
            <SectionHeader title="최근 올라온 피드" moreHref="/posts" moreLabel="전체보기" />
            
            <div className="grid gap-4">
              {postCards.map((post) => {
                const author = postAuthorMap.get(post.user_id)
                return (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <article className="bg-white p-5 rounded-[24px] border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt={author.nickname} className="w-8 h-8 rounded-full object-cover bg-muted" />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                          {author ? author.nickname.slice(0, 1) : <User size={16} />}
                        </div>
                      )}
                      <span className="text-sm font-bold">{author ? `${author.nickname}님의 소식` : '소식'}</span>
                    </div>
                    <p className="text-foreground leading-relaxed line-clamp-2 mb-3">
                      {post.content || '사진을 공유했어요.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <ImageIcon size={14} />
                      {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </div>
                  </article>
                </Link>
              )
              })}
            </div>
          </section>

          {/* 3. 추천 모임 */}
          <section>
            <SectionHeader title="함께할 모임" moreHref="/groups" moreLabel="모든 모임" />
            
            <div className="grid gap-4">
              {groupCards.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <article className="bg-white p-5 rounded-[24px] border border-border/50 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                      <Users size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {[group.category, group.region].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground/50" size={20} />
                  </article>
                </Link>
              ))}
            </div>
          </section>

          <section className="pt-4 px-1">
            <SilverButton variant="primary" className="w-full" icon={<Users />}>
              새로운 모임 만들기
            </SilverButton>
          </section>
        </div>
      </main>
    </div>
  )
}
