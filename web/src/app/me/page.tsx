'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

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

  // 인라인 편집 상태
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
        profileRes,
        postsRes,
        sentInterestRes,
        receivedInterestRes,
        friendshipsLowRes,
        friendshipsHighRes,
        conversationsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('posts')
          .select('id,image_url,content,visibility,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('relationship_requests')
          .select('target_user_id', { count: 'exact', head: true })
          .eq('requester_user_id', user.id),
        supabase
          .from('relationship_requests')
          .select('requester_user_id', { count: 'exact', head: true })
          .eq('target_user_id', user.id),
        supabase
          .from('friendships')
          .select('user_high_id', { count: 'exact', head: true })
          .eq('user_low_id', user.id),
        supabase
          .from('friendships')
          .select('user_low_id', { count: 'exact', head: true })
          .eq('user_high_id', user.id),
        supabase
          .from('conversation_members')
          .select('conversation_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      const firstError =
        profileRes.error || postsRes.error || sentInterestRes.error ||
        receivedInterestRes.error || friendshipsLowRes.error ||
        friendshipsHighRes.error || conversationsRes.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

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
    for (const post of posts) {
      counts.set(post.visibility, (counts.get(post.visibility) ?? 0) + 1)
    }
    return visibilityLabel(
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'members'
    )
  }, [posts])

  function startEdit(post: PostRow) {
    setEditingPostId(post.id)
    setEditForm({
      content: post.content ?? '',
      imageUrl: post.image_url ?? '',
      visibility: post.visibility,
    })
  }

  function cancelEdit() {
    setEditingPostId(null)
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

      const { data, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(path, file, { upsert: false })

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
      body: JSON.stringify({
        content: editForm.content,
        imageUrl: editForm.imageUrl,
        visibility: editForm.visibility,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? '피드 수정에 실패했습니다.')
      setSavingEdit(false)
      return
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === editingPostId
          ? {
              ...post,
              content: editForm.content || null,
              image_url: editForm.imageUrl || null,
              visibility: editForm.visibility,
            }
          : post
      )
    )
    setEditingPostId(null)
    setSavingEdit(false)
  }

  async function deletePost(postId: number) {
    if (!window.confirm('이 피드를 삭제할까요?')) return

    setDeletingPostId(postId)
    setError(null)

    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null

    if (!response.ok) {
      setError(payload?.error ?? '피드 삭제에 실패했습니다.')
      setDeletingPostId(null)
      return
    }

    setPosts((prev) => prev.filter((post) => post.id !== postId))
    setDeletingPostId(null)
  }

  if (loading) return <div style={{ padding: 24 }}>로딩 중...</div>
  if (error && !posts.length) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>마이</h1>
      <p style={{ marginTop: 8, color: '#57534e' }}>
        내 프로필과 피드, 관계 현황을 한 곳에서 확인하세요.
      </p>
      <AppNav />

      {/* 프로필 카드 */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <ProfileAvatar avatarUrl={profile?.avatar_url ?? null} nickname={profile?.nickname ?? '나'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{profile?.nickname ?? '프로필 준비 중'}</div>
            <div style={{ marginTop: 6, color: '#57534e' }}>
              {[profile?.age_band, profile?.region, profile?.relationship_purpose]
                .filter(Boolean)
                .join(' · ') || '기본 정보를 더 입력해 주세요.'}
            </div>
            {profile?.bio && (
              <p style={{ marginTop: 10, color: '#44403c', lineHeight: 1.6 }}>{profile.bio}</p>
            )}
          </div>
          <Link
            href="/onboarding?edit=1"
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid #d6d3d1',
              textDecoration: 'none',
              color: '#1c1917',
              fontWeight: 600,
            }}
          >
            프로필 수정
          </Link>
        </div>

        {!!profile?.hobbies?.length && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.hobbies.map((hobby) => (
              <span key={hobby} style={{ padding: '8px 12px', borderRadius: 999, background: '#f5f5f4' }}>
                {hobby}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 활동 요약 */}
      <section style={{ ...cardStyle, background: '#f5f5f4' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>내 활동 요약</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <SummaryCard label="내 피드" value={posts.length} />
          <SummaryCard label="보낸 관심" value={sentInterestCount} />
          <SummaryCard label="받은 관심" value={receivedInterestCount} />
          <SummaryCard label="1촌" value={friendCount} />
          <SummaryCard label="대화" value={conversationCount} />
        </div>
      </section>

      {/* 내 생활 피드 */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>내 생활 피드</h2>
            <p style={{ marginTop: 6, color: '#57534e' }}>
              가장 자주 쓰는 공개범위: {mostUsedVisibility}
            </p>
          </div>
          <Link href="/posts" style={{ textDecoration: 'underline', color: '#57534e', fontWeight: 600 }}>
            피드 전체 보기
          </Link>
        </div>

        {error && <p style={{ marginTop: 10, color: 'crimson' }}>{error}</p>}

        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          {posts.map((post) => (
            <article
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 16,
                background: '#fafaf9',
                border: '1px solid #f0ede8',
              }}
            >
              {editingPostId === post.id ? (
                /* ── 인라인 편집 폼 ── */
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>피드 수정</div>

                  {/* 이미지 */}
                  <div style={{ marginBottom: 12 }}>
                    {editForm.imageUrl && (
                      <div style={{ marginBottom: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editForm.imageUrl}
                          alt="수정 이미지 미리보기"
                          style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, background: '#e7e5e4' }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: '' }))}
                          style={{ marginTop: 6, padding: '6px 10px', fontSize: 13, borderRadius: 999, border: '1px solid #d6d3d1', background: '#fff' }}
                        >
                          사진 제거
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploadingEditImage}
                      style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid #d6d3d1', background: '#fafaf9', fontWeight: 600, fontSize: 14 }}
                    >
                      {uploadingEditImage ? '업로드 중...' : editForm.imageUrl ? '사진 교체' : '사진 선택'}
                    </button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleEditImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* 본문 */}
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 6, fontWeight: 600 }}>글</label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                    style={{ width: '100%', padding: 10, fontSize: 15, minHeight: 100, borderRadius: 10, border: '1px solid #d6d3d1', boxSizing: 'border-box' }}
                    placeholder="내용을 입력해 주세요."
                  />

                  {/* 공개범위 */}
                  <label style={{ display: 'block', fontSize: 14, marginTop: 10, marginBottom: 6, fontWeight: 600 }}>공개범위</label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, visibility: e.target.value }))}
                    style={{ width: '100%', padding: 10, fontSize: 15, borderRadius: 10, border: '1px solid #d6d3d1' }}
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* 저장/취소 */}
                  <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={savingEdit || uploadingEditImage}
                      style={{ padding: '10px 16px', borderRadius: 999, background: '#1c1917', color: '#fff', fontWeight: 700, border: 'none' }}
                    >
                      {savingEdit ? '저장 중...' : '저장'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #d6d3d1', background: '#fff', fontWeight: 600 }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 일반 보기 ── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ color: '#57534e', fontSize: 14 }}>{visibilityLabel(post.visibility)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link
                        href={`/posts/${post.id}`}
                        style={{ padding: '8px 10px', fontSize: 13, textDecoration: 'underline', color: '#57534e' }}
                      >
                        상세
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        disabled={deletingPostId === post.id}
                        style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid #d6d3d1', background: '#fff', fontWeight: 600 }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid #d6d3d1', background: '#fff', fontWeight: 600, color: '#b91c1c' }}
                      >
                        {deletingPostId === post.id ? '삭제 중...' : '삭제'}
                      </button>
                      <div style={{ color: '#78716c', fontSize: 13 }}>{formatDate(post.created_at)}</div>
                    </div>
                  </div>
                  {post.image_url && (
                    <div style={{ marginTop: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.image_url}
                        alt="내 피드 이미지"
                        style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 14, background: '#e7e5e4' }}
                      />
                    </div>
                  )}
                  {post.content && (
                    <p style={{ marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                  )}
                </>
              )}
            </article>
          ))}
          {posts.length === 0 && (
            <div style={{ color: '#57534e' }}>아직 작성한 피드가 없어요. 첫 생활 피드를 남겨보세요.</div>
          )}
        </div>
      </section>

      {/* 빠른 이동 */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>빠른 이동</h2>
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <QuickLink
            title="관계 관리"
            description="보낸 관심, 받은 관심, 1촌, 진행 중 대화를 확인합니다."
            href="/relationships"
          />
          <QuickLink
            title="설정 / 고객센터"
            description="기본 공개범위, 차단 목록, 문의 안내를 관리합니다."
            href="/settings"
          />
          <QuickLink
            title="대화"
            description="조건을 만족한 개인 대화와 최근 메시지를 확인합니다."
            href="/messages"
          />
        </div>
      </section>
    </div>
  )
}

// ── 보조 컴포넌트 ──────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 16, borderRadius: 16, background: '#fff', border: '1px solid #e7e5e4' }}>
      <div style={{ fontSize: 14, color: '#57534e' }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function QuickLink({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: 16,
        borderRadius: 16,
        textDecoration: 'none',
        color: '#1c1917',
        background: '#fafaf9',
        border: '1px solid #f0ede8',
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 6, color: '#57534e' }}>{description}</div>
    </Link>
  )
}

function ProfileAvatar({ avatarUrl, nickname }: { avatarUrl: string | null; nickname: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', background: '#e7e5e4' }}
      />
    )
  }
  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        color: '#1c1917',
        fontSize: 32,
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
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

const cardStyle = {
  marginTop: 20,
  padding: 20,
  borderRadius: 20,
  border: '1px solid #e7e5e4',
  background: '#fff',
} as const
