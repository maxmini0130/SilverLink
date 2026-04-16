import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { RelationshipActions } from '@/components/relationship-actions'
import { SafetyActions } from '@/components/safety-actions'
import { ChevronLeft, User, ShieldCheck, MapPin, Heart, Calendar } from 'lucide-react'
import { visibilityLabel } from '@/lib/visibility'

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: block } = await supabase
    .from('blocks')
    .select('blocker_user_id')
    .or(`and(blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${id}),and(blocker_user_id.eq.${id},blocked_user_id.eq.${auth.user.id})`)
    .maybeSingle()

  if (block) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-border/50 max-w-md w-full">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/40">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-4">프로필을 볼 수 없어요</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            차단 관계가 있어 이 프로필 정보를 확인할 수 없습니다.
          </p>
          <Link href="/people" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
            <ChevronLeft size={20} />
            사람 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
    .eq('user_id', id)
    .maybeSingle()

  if (!profile) notFound()

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id,content,image_url,visibility,created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto">
        {/* 상단 네비게이션 */}
        <div className="px-5 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <Link href="/people" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-border/50 text-foreground">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="font-bold text-lg">프로필 상세</h2>
          <div className="w-10"></div>
        </div>

        {/* 프로필 헤더 카드 */}
        <section className="px-5 mt-4">
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-border/50">
            {/* 상단 컬러 배너 (옵션) */}
            <div className="h-24 bg-primary/10"></div>
            
            <div className="px-6 pb-8 -mt-12 text-center">
              <div className="inline-block relative">
                <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
                <div className="absolute bottom-1 right-1 bg-white p-1.5 rounded-full shadow-md">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
                    <ShieldCheck size={14} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h1 className="text-3xl font-extrabold text-foreground">{profile.nickname}</h1>
                <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground font-medium">
                  <MapPin size={16} />
                  <span>{[profile.age_band, profile.region].filter(Boolean).join(' • ') || '기본 정보 없음'}</span>
                </div>
                {profile.relationship_purpose && (
                  <div className="inline-block mt-4 px-4 py-1.5 bg-secondary/10 text-secondary font-bold text-sm rounded-full">
                    {profile.relationship_purpose}
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-6 text-left">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                    자기소개
                  </h3>
                  <div className="bg-muted/30 p-5 rounded-[20px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {profile.bio?.trim() || '아직 자기소개를 작성하지 않았어요.'}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                    관심사
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {(profile.hobbies ?? []).length > 0 ? (
                      profile.hobbies?.map((hobby: string) => (
                        <span key={hobby} className="px-4 py-2 bg-white border border-border/60 shadow-sm rounded-full text-[16px] font-semibold text-foreground">
                          {hobby}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">아직 관심사를 등록하지 않았어요.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 관계 액션 카드 */}
        <section className="px-5 mt-6">
          <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
              <Heart className="fill-primary" size={20} />
              관계 맺기
            </h3>
            <p className="text-muted-foreground font-medium text-[15px] mb-6">
              관심을 보내고, 상호 관심이 되면 대화를 시작할 수 있어요.
            </p>
            <div className="flex flex-col gap-3">
              <RelationshipActions targetUserId={profile.user_id} />
              <SafetyActions targetUserId={profile.user_id} />
            </div>
          </div>
        </section>

        {/* 최근 피드 섹션 */}
        <section className="px-5 mt-10">
          <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="text-2xl font-bold text-foreground">최근 올린 피드</h3>
            <Link href="/posts" className="text-primary font-bold text-sm">전체보기</Link>
          </div>
          
          {recentPosts && recentPosts.length > 0 ? (
            <div className="grid gap-5">
              {recentPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="block group">
                  <article className="bg-white rounded-[24px] border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden p-4">
                    {post.image_url && (
                      <div className="aspect-[16/9] w-full rounded-[16px] overflow-hidden mb-4 bg-muted">
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="px-1">
                      {post.content && (
                        <p className="text-foreground leading-relaxed line-clamp-3 mb-4 text-[17px]">
                          {post.content}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        <span className="bg-muted px-2.5 py-1 rounded-full text-[12px]">
                          {visibilityLabel(post.visibility)}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[32px] border border-dashed border-border flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/30">
                <ImageIcon size={32} />
              </div>
              <p className="text-muted-foreground font-medium">아직 공개된 피드가 없어요.</p>
            </div>
          )}
        </section>
      </main>

      <AppNav />
    </div>
  )
}

function ProfileAvatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null
  nickname: string
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        className="w-32 h-32 rounded-full object-cover ring-4 ring-white shadow-lg bg-muted"
      />
    )
  }

  return (
    <div className="w-32 h-32 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-black ring-4 ring-white shadow-lg">
      {nickname.slice(0, 1)}
    </div>
  )
}
import { Image as ImageIcon } from 'lucide-react'
