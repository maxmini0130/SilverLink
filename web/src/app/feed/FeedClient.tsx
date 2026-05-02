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
}

export default function FeedClient({ initialPosts, userId }: { initialPosts: Post[]; userId: string }) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [newContent, setNewContent] = useState('')
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
      .insert({ user_id: userId, content, visibility: 'all' })
      .select('id, content, created_at, user_id')
      .single()

    setPosting(false)
    if (err) return setError(err.message)

    const { data: prof } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single()

    setPosts([{ ...data, nickname: prof?.nickname ?? '익명', likeCount: 0, liked: false }, ...posts])
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
          style={{ minHeight: 100, resize: 'vertical', marginBottom: 10 }}
        />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <Link href={p.user_id === userId ? '/me' : `/people/${p.user_id}`} style={{ fontWeight: 700, fontSize: 17, color: 'inherit', textDecoration: 'none' }}>
                {p.nickname}
              </Link>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                {new Date(p.created_at).toLocaleDateString('ko-KR')}
              </span>
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
