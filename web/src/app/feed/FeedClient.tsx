'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Post = {
  id: number
  content: string
  nickname: string
  created_at: string
  likeCount: number
  liked: boolean
  user_id: string
  visibility: 'all' | 'friends' | 'same_group'
}

const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체 공개', desc: '모든 회원이 볼 수 있어요' },
  { value: 'friends', label: '1촌만', desc: '1촌 관계인 분들만 볼 수 있어요' },
  { value: 'same_group', label: '같은 모임만', desc: '함께하는 모임 멤버만 볼 수 있어요' },
] as const

type VisibilityValue = 'all' | 'friends' | 'same_group'

export default function FeedClient({ initialPosts, userId }: { initialPosts: Post[]; userId: string }) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [newContent, setNewContent] = useState('')
  const [visibility, setVisibility] = useState<VisibilityValue>('all')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitPost() {
    const content = newContent.trim()
    if (!content) return
    if (content.length > 1000) return setError('1000자 이내로 작성해 주세요.')
    setPosting(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('posts')
      .insert({ user_id: userId, content, visibility })
      .select('id, content, created_at, user_id')
      .single()

    setPosting(false)
    if (err) return setError(err.message)

    const { data: prof } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single()

    setPosts([{ ...data, nickname: prof?.nickname ?? '익명', likeCount: 0, liked: false, visibility }, ...posts])
    setNewContent('')
  }

  async function toggleLike(post: Post) {
    if (post.liked) {
      await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', userId)
      setPosts(posts.map((p) => p.id === post.id ? { ...p, liked: false, likeCount: p.likeCount - 1 } : p))
    } else {
      await supabase.from('post_reactions').insert({ post_id: post.id, user_id: userId, reaction_type: 'like' })
      setPosts(posts.map((p) => p.id === post.id ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p))
    }
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>생활 피드</h1>

      {/* 글쓰기 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <textarea
          className="input"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="오늘 있었던 일을 나눠보세요..."
          style={{ minHeight: 100, resize: 'vertical', marginBottom: 14 }}
        />

        {/* 공개범위 선택 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>공개 범위</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: `2px solid ${visibility === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: visibility === opt.value ? '#eff6ff' : '#fff',
                  color: visibility === opt.value ? 'var(--primary)' : 'var(--muted)',
                  fontSize: 15,
                  fontWeight: visibility === opt.value ? 700 : 400,
                  cursor: 'pointer',
                  minHeight: 'auto',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
            {VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.desc}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{newContent.length} / 1000</span>
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 24px' }} onClick={submitPost} disabled={posting || !newContent.trim()}>
            {posting ? '올리는 중...' : '올리기'}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      {/* 피드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
            아직 글이 없어요. 첫 글을 남겨보세요!
          </div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <Link href={p.user_id === userId ? '/me' : `/people/${p.user_id}`} style={{ fontWeight: 700, fontSize: 17, color: 'inherit', textDecoration: 'none' }}>
                {p.nickname}
              </Link>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </span>
                {p.visibility !== 'all' && (
                  <span style={{ fontSize: 13, color: 'var(--primary)', background: '#eff6ff', borderRadius: 999, padding: '2px 8px' }}>
                    {p.visibility === 'friends' ? '1촌만' : '모임만'}
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0 }}>{p.content}</p>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => toggleLike(p)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 17,
                  color: p.liked ? '#e11d48' : 'var(--muted)',
                  minHeight: 'auto',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {p.liked ? '❤️' : '🤍'} {p.likeCount}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
