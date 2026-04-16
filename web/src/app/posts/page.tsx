'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SafetyActions } from '@/components/safety-actions'
import { SilverButton } from '@/components/common/silver-button'
import { Image as ImageIcon, Plus, X, Globe, Lock, Users, Heart, MessageSquare, Camera, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibilityLabel, type Visibility } from '@/lib/visibility'
import { EmptyState } from '@/components/common/empty-state'

type PostRow = {
  id: number
  user_id: string
  image_url: string | null
  content: string | null
  visibility: Visibility
  created_at: string
}

type ProfileRow = {
  user_id: string
  nickname: string
  region: string | null
  avatar_url: string | null
  default_post_visibility?: Visibility | null
}

type ReactionRow = {
  post_id: number
  user_id: string
  reaction_type: string
}

const VISIBILITY_ICONS: Record<Visibility, any> = {
  private: Lock,
  friends: Users,
  interested: Heart,
  same_group: Users,
  members: Globe,
}

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; icon: any }> = (
  ['private', 'friends', 'interested', 'same_group', 'members'] as Visibility[]
).map((v) => ({ value: v, label: visibilityLabel(v), icon: VISIBILITY_ICONS[v] }))

const REACTIONS = ['따뜻해요', '응원해요', '반가워요'] as const

export default function PostsPage() {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [posts, setPosts] = useState<PostRow[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [interestIds, setInterestIds] = useState<Set<string>>(new Set())
  const [sharedGroupIds, setSharedGroupIds] = useState<Set<string>>(new Set())
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [imageUrl, setImageUrl] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('members')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)

      const [postsRes, profilesRes, reactionsRes, sentInterestRes, receivedInterestRes, friendshipsLowRes, friendshipsHighRes, myMembershipsRes, allMembershipsRes, blocksRes] = await Promise.all([
        supabase.from('posts').select('id,user_id,image_url,content,visibility,created_at').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id,nickname,region,avatar_url,default_post_visibility'),
        supabase.from('post_reactions').select('post_id,user_id,reaction_type'),
        supabase.from('relationship_requests').select('target_user_id').eq('requester_user_id', user.id),
        supabase.from('relationship_requests').select('requester_user_id').eq('target_user_id', user.id),
        supabase.from('friendships').select('user_high_id').eq('user_low_id', user.id),
        supabase.from('friendships').select('user_low_id').eq('user_high_id', user.id),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.from('group_members').select('group_id,user_id'),
        supabase.from('blocks').select('blocker_user_id,blocked_user_id').or(`blocker_user_id.eq.${user.id},blocked_user_id.eq.${user.id}`),
      ])

      const profileMap = new Map(((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.user_id, p]))
      setProfiles(profileMap)
      setPosts((postsRes.data ?? []) as PostRow[])
      setReactions((reactionsRes.data ?? []) as ReactionRow[])
      setVisibility((profileMap.get(user.id)?.default_post_visibility ?? 'members') as Visibility)

      const fIds = new Set<string>([...((friendshipsLowRes.data ?? []).map((r) => r.user_high_id as string)), ...((friendshipsHighRes.data ?? []).map((r) => r.user_low_id as string))])
      setFriendIds(fIds)
      setInterestIds(new Set([...((sentInterestRes.data ?? []).map((r) => r.target_user_id as string)), ...((receivedInterestRes.data ?? []).map((r) => r.requester_user_id as string)), ...Array.from(fIds)]))
      
      const myGIds = new Set((myMembershipsRes.data ?? []).map((r) => r.group_id as string))
      const sGroups = new Set<string>()
      for (const m of allMembershipsRes.data ?? []) {
        if (m.user_id !== user.id && myGIds.has(m.group_id as string)) sGroups.add(m.user_id as string)
      }
      setSharedGroupIds(sGroups)
      setBlockedIds(new Set((blocksRes.data ?? []).map((r) => r.blocker_user_id === user.id ? r.blocked_user_id : r.blocker_user_id)))
      setLoading(false)
    })()
  }, [supabase])

  const visiblePosts = useMemo(() => {
    if (!currentUserId) return []
    return posts.filter((p) => {
      if (blockedIds.has(p.user_id)) return false
      if (p.user_id === currentUserId) return true
      if (p.visibility === 'members') return true
      if (p.visibility === 'friends') return friendIds.has(p.user_id)
      if (p.visibility === 'interested') return interestIds.has(p.user_id)
      if (p.visibility === 'same_group') return sharedGroupIds.has(p.user_id)
      return false
    })
  }, [blockedIds, currentUserId, friendIds, interestIds, posts, sharedGroupIds])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return
    setUploadingImage(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${currentUserId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('post-images').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
      setImageUrl(publicUrl)
    } catch (err) {
      setError('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || (!content.trim() && !imageUrl.trim())) return
    setSubmitting(true)
    const { data, error: insertError } = await supabase.from('posts').insert({ user_id: currentUserId, image_url: imageUrl || null, content: content || null, visibility }).select().single()
    if (data) {
      setPosts((prev) => [data as PostRow, ...prev])
      setImageUrl(''); setContent(''); setShowInput(false)
    } else {
      setError(insertError?.message ?? '등록 실패')
    }
    setSubmitting(false)
  }

  async function toggleReaction(postId: number, reactionType: string) {
    if (!currentUserId) return
    const existing = reactions.find((r) => r.post_id === postId && r.user_id === currentUserId && r.reaction_type === reactionType)
    if (existing) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', currentUserId).eq('reaction_type', reactionType)
      setReactions((prev) => prev.filter((r) => !(r.post_id === postId && r.user_id === currentUserId && r.reaction_type === reactionType)))
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: currentUserId, reaction_type: reactionType })
      setReactions((prev) => [...prev, { post_id: postId, user_id: currentUserId, reaction_type: reactionType }])
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">생활 피드</h1>
            <p className="mt-2 text-muted-foreground font-medium">따뜻한 일상을 나누고 소통해 보세요.</p>
          </div>
          {!showInput && (
            <SilverButton size="md" icon={<Plus />} onClick={() => setShowInput(true)}>올리기</SilverButton>
          )}
        </header>

        <AppNav />

        {/* 피드 작성 섹션 */}
        {showInput && (
          <section className="mb-10 bg-white p-6 rounded-[32px] border-2 border-primary/20 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <Camera size={18} />
                </div>
                오늘의 소식 전하기
              </h2>
              <button onClick={() => setShowInput(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={createPost} className="space-y-6">
              <div className="relative group">
                {imageUrl ? (
                  <div className="relative aspect-[16/9] rounded-[20px] overflow-hidden bg-muted">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImageUrl('')} className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-md">
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-[16/9] rounded-[20px] border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground group">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Camera size={28} />
                    </div>
                    <span className="font-bold">{uploadingImage ? '올리는 중...' : '사진 추가하기'}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-5 bg-muted/30 rounded-[20px] border-none focus:ring-2 focus:ring-primary/20 text-lg min-h-[120px] placeholder:text-muted-foreground/50" placeholder="반가운 소식을 들려주세요..." />

              <div className="flex flex-wrap gap-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)} className={cn("px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all", visibility === opt.value ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    <opt.icon size={16} />
                    {opt.label}
                  </button>
                ))}
              </div>

              <SilverButton type="submit" disabled={submitting || uploadingImage} className="w-full">
                {submitting ? '등록 중...' : '소식 올리기'}
              </SilverButton>
            </form>
          </section>
        )}

        {/* 피드 목록 */}
        <div className="space-y-8 mt-8">
          {visiblePosts.map((post) => {
            const author = profiles.get(post.user_id)
            const postReactions = reactions.filter((r) => r.post_id === post.id)
            const visOpt = VISIBILITY_OPTIONS.find(o => o.value === post.visibility)

            return (
              <article key={post.id} className="bg-white rounded-[32px] border border-border/50 shadow-sm overflow-hidden p-6 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-6">
                  <Link href={`/people/${post.user_id}`} className="flex gap-4 items-center group">
                    <ProfileAvatar avatarUrl={author?.avatar_url ?? null} nickname={author?.nickname ?? '자'} />
                    <div>
                      <div className="text-xl font-bold group-hover:text-primary transition-colors">{author?.nickname ?? '사용자'}</div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground font-medium">
                        <Clock size={14} />
                        {formatDate(post.created_at)}
                        <span>•</span>
                        <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-[11px]">
                          {visOpt && <visOpt.icon size={10} />}
                          {visOpt?.label}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {currentUserId !== post.user_id && (
                    <SafetyActions targetUserId={post.user_id} postId={post.id} compact />
                  )}
                </div>

                {post.image_url && (
                  <div className="mb-5 rounded-[24px] overflow-hidden bg-muted aspect-[4/3]">
                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {post.content && (
                  <p className="text-[18px] leading-relaxed text-foreground mb-6 whitespace-pre-wrap px-1">
                    {post.content}
                  </p>
                )}

                <div className="flex flex-wrap gap-2.5 pt-6 border-t border-border/40">
                  {REACTIONS.map((type) => {
                    const count = postReactions.filter((r) => r.reaction_type === type).length
                    const mine = postReactions.some((r) => r.user_id === currentUserId && r.reaction_type === type)
                    return (
                      <button key={type} onClick={() => toggleReaction(post.id, type)} className={cn("px-5 py-2.5 rounded-full text-[15px] font-bold transition-all flex items-center gap-2", mine ? "bg-secondary text-white shadow-sm" : "bg-secondary/5 text-secondary hover:bg-secondary/10")}>
                        {type}
                        {count > 0 && <span className={cn("inline-flex items-center justify-center min-w-[20px] h-[20px] text-[12px] rounded-full", mine ? "bg-white text-secondary" : "bg-secondary text-white")}>{count}</span>}
                      </button>
                    )
                  })}
                  <Link href={`/posts/${post.id}`} className="ml-auto w-10 h-10 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </article>
            )
          })}
          
          {visiblePosts.length === 0 && (
            <EmptyState
              icon={ImageIcon}
              title="아직 볼 수 있는 소식이 없어요."
              description="첫 피드를 올려 이웃과 인사해 보세요."
              action={
                <SilverButton variant="ghost" onClick={() => setShowInput(true)}>
                  첫 소식 올리기
                </SilverButton>
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}

function ProfileAvatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm" />
  ) : (
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-black text-muted-foreground ring-2 ring-white shadow-sm">
      {nickname.slice(0, 1)}
    </div>
  )
}

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
