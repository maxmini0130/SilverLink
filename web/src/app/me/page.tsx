'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { User, Heart, MessageSquare, Users, Image as ImageIcon, Pencil, Trash2, X, ChevronRight } from 'lucide-react'

type ProfileRow = {
  user_id: string
  nickname: string
  age_band: string | null
  region: string | null
  hobbies: string[] | null
  relationship_purpose: string | null
  bio: string | null
  avatar_url: string | null
}

type PostRow = {
  id: number
  image_url: string | null
  content: string | null
  visibility: string
  created_at: string
}

type EditForm = {
  content: string
  imageUrl: string
  visibility: string
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: '나만 보기' },
  { value: 'friends', label: '1촌만 보기' },
  { value: 'interested', label: '관심 있는 사람만 보기' },
  { value: 'same_group', label: '같은 모임 사람만 보기' },
  { value: 'members', label: '전체 인증회원 보기' },
]

export default function MePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [sentInterestCount, setSentInterestCount] = useState(0)
  const [receivedInterestCount, setReceivedInterestCount] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [conversationCount, setConversationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ content: '', imageUrl: '', visibility: 'members' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditImage, setUploadingEditImage] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const [
        profileRes, postsRes, sentInterestRes, receivedInterestRes,
        friendshipsLowRes, friendshipsHighRes, conversationsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url').eq('user_id', user.id).maybeSingle(),
        supabase.from('posts').select('id,image_url,content,visibility,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('relationship_requests').select('target_user_id', { count: 'exact', head: true }).eq('requester_user_id', user.id),
        supabase.from('relationship_requests').select('requester_user_id', { count: 'exact', head: true }).eq('target_user_id', user.id),
        supabase.from('friendships').select('user_high_id', { count: 'exact', head: true }).eq('user_low_id', user.id),
        supabase.from('friendships').select('user_low_id', { count: 'exact', head: true }).eq('user_high_id', user.id),
        supabase.from('conversation_members').select('conversation_id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const firstError = profileRes.error || postsRes.error || sentInterestRes.error ||
        receivedInterestRes.error || friendshipsLowRes.error || friendshipsHighRes.error || conversationsRes.error
      if (firstError) { setError(firstError.message); setLoading(false); return }

      setProfile((profileRes.data as ProfileRow | null) ?? null)
      setPosts((postsRes.data ?? []) as PostRow[])
      setSentInterestCount(sentInterestRes.count ?? 0)
      setReceivedInterestCount(receivedInterestRes.count ?? 0)
      setFriendCount((friendshipsLowRes.count ?? 0) + (friendshipsHighRes.count ?? 0))
      setConversationCount(conversationsRes.count ?? 0)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mostUsedVisibility = useMemo(() => {
    if (posts.length === 0) return '아직 없음'
    const counts = new Map<string, number>()
    for (const post of posts) counts.set(post.visibility, (counts.get(post.visibility) ?? 0) + 1)
    return visibilityLabel([...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'members')
  }, [posts])

  function startEdit(post: PostRow) {
    setEditingPostId(post.id)
    setEditForm({ content: post.content ?? '', imageUrl: post.image_url ?? '', visibility: post.visibility })
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEditImage(true)
    setError(null)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data, error: uploadError } = await supabase.storage.from('post-images').upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(data.path)
      setEditForm((prev) => ({ ...prev, imageUrl: publicUrl }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingEditImage(false)
    }
  }

  async function saveEdit() {
    if (editingPostId === null) return
    setSavingEdit(true)
    setError(null)
    const response = await fetch(`/api/posts/${editingPostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editForm.content, imageUrl: editForm.imageUrl, visibility: editForm.visibility }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) { setError(payload?.error ?? '피드 수정에 실패했습니다.'); setSavingEdit(false); return }
    setPosts((prev) => prev.map((post) =>
      post.id === editingPostId
        ? { ...post, content: editForm.content || null, image_url: editForm.imageUrl || null, visibility: editForm.visibility }
        : post
    ))
    setEditingPostId(null)
    setSavingEdit(false)
  }

  async function deletePost(postId: number) {
    if (!window.confirm('이 피드를 삭제할까요?')) return
    setDeletingPostId(postId)
    setError(null)
    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) { setError(payload?.error ?? '피드 삭제에 실패했습니다.'); setDeletingPostId(null); return }
    setPosts((prev) => prev.filter((post) => post.id !== postId))
    setDeletingPostId(null)
  }

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>
  if (error && !posts.length) return <div className="p-10 text-center text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">마이</h1>
            <p className="mt-2 text-muted-foreground font-medium">내 프로필과 피드를 관리하세요.</p>
          </div>
        </header>

        <AppNav />

        {/* 프로필 카드 */}
        <section className="mt-8 bg-white rounded-[32px] border border-border/50 shadow-sm overflow-hidden">
          <div className="h-20 bg-primary/10" />
          <div className="px-6 pb-6 -mt-10">
            <div className="flex items-end justify-between mb-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="프로필 사진" className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md bg-muted" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-black ring-4 ring-white shadow-md">
                  {(profile?.nickname ?? '나').slice(0, 1)}
                </div>
              )}
              <Link
                href="/onboarding?edit=1"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/60 bg-white text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                <Pencil size={14} />
                프로필 수정
              </Link>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">{profile?.nickname ?? '프로필 준비 중'}</h2>
            <p className="mt-1 text-muted-foreground font-medium">
              {[profile?.age_band, profile?.region, profile?.relationship_purpose].filter(Boolean).join(' · ') || '기본 정보를 더 입력해 주세요.'}
            </p>
            {profile?.bio && (
              <p className="mt-3 text-foreground leading-relaxed">{profile.bio}</p>
            )}
            {!!profile?.hobbies?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.hobbies.map((hobby) => (
                  <span key={hobby} className="px-3 py-1.5 bg-muted rounded-full text-sm font-semibold text-foreground">{hobby}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 활동 요약 */}
        <section className="mt-6 bg-white rounded-[32px] border border-border/50 shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <User size={20} className="text-primary" />
            내 활동 요약
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="내 피드" value={posts.length} icon={<ImageIcon size={18} />} />
            <StatCard label="보낸 관심" value={sentInterestCount} icon={<Heart size={18} />} />
            <StatCard label="받은 관심" value={receivedInterestCount} icon={<Heart size={18} className="fill-secondary text-secondary" />} />
            <StatCard label="1촌" value={friendCount} icon={<Users size={18} />} />
            <StatCard label="대화" value={conversationCount} icon={<MessageSquare size={18} />} />
          </div>
        </section>

        {/* 내 생활 피드 */}
        <section className="mt-6 bg-white rounded-[32px] border border-border/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-foreground">내 생활 피드</h2>
            <Link href="/posts" className="text-sm font-bold text-primary hover:underline">전체보기</Link>
          </div>
          <p className="text-sm text-muted-foreground mb-5">가장 자주 쓰는 공개범위: <span className="font-semibold text-foreground">{mostUsedVisibility}</span></p>

          {error && <p className="mb-4 text-red-500 text-sm font-medium">{error}</p>}

          <div className="space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="bg-muted/30 rounded-[20px] border border-border/40 p-4">
                {editingPostId === post.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">피드 수정</span>
                      <button type="button" onClick={() => setEditingPostId(null)} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                      </button>
                    </div>

                    {editForm.imageUrl && (
                      <div className="relative">
                        <img src={editForm.imageUrl} alt="수정 이미지 미리보기" className="w-full max-h-48 object-cover rounded-[16px] bg-muted" />
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploadingEditImage}
                      className="px-4 py-2 rounded-full border border-border/60 bg-white text-sm font-semibold hover:bg-muted/50 transition-colors"
                    >
                      {uploadingEditImage ? '업로드 중...' : editForm.imageUrl ? '사진 교체' : '사진 선택'}
                    </button>
                    <input ref={editFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleEditImageUpload} className="hidden" />

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">글</label>
                      <textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground min-h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="내용을 입력해 주세요."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">공개범위</label>
                      <select
                        value={editForm.visibility}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, visibility: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {VISIBILITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={savingEdit || uploadingEditImage}
                        className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm disabled:opacity-60"
                      >
                        {savingEdit ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        disabled={savingEdit}
                        className="px-5 py-2.5 rounded-full border border-border/60 bg-white font-semibold text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-muted rounded-full text-muted-foreground">
                        {visibilityLabel(post.visibility)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Link href={`/posts/${post.id}`} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <ChevronRight size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEdit(post)}
                          disabled={deletingPostId === post.id}
                          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="p-2 rounded-full hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                        >
                          {deletingPostId === post.id ? <span className="text-xs">삭제 중</span> : <Trash2 size={16} />}
                        </button>
                        <span className="text-xs text-muted-foreground ml-1">{formatDate(post.created_at)}</span>
                      </div>
                    </div>
                    {post.image_url && (
                      <img src={post.image_url} alt="내 피드 이미지" className="w-full max-h-64 object-cover rounded-[16px] bg-muted mb-3" />
                    )}
                    {post.content && (
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    )}
                  </>
                )}
              </article>
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                아직 작성한 피드가 없어요. 첫 생활 피드를 남겨보세요.
              </div>
            )}
          </div>
        </section>

        {/* 빠른 이동 */}
        <section className="mt-6 bg-white rounded-[32px] border border-border/50 shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">빠른 이동</h2>
          <div className="space-y-3">
            <QuickLink title="관계 관리" description="보낸 관심, 받은 관심, 1촌, 진행 중 대화를 확인합니다." href="/relationships" />
            <QuickLink title="설정 / 고객센터" description="기본 공개범위, 차단 목록, 문의 안내를 관리합니다." href="/settings" />
            <QuickLink title="대화" description="조건을 만족한 개인 대화와 최근 메시지를 확인합니다." href="/messages" />
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-muted/40 rounded-[20px] p-4 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  )
}

function QuickLink({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 rounded-[20px] bg-muted/30 border border-border/40 hover:bg-muted/60 transition-colors group"
    >
      <div>
        <div className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
      </div>
      <ChevronRight size={20} className="text-muted-foreground/50 shrink-0" />
    </Link>
  )
}

function visibilityLabel(value: string) {
  return VISIBILITY_OPTIONS.find((opt) => opt.value === value)?.label ?? value
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
