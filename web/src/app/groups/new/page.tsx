'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Tag, MapPin, AlignLeft, Users } from 'lucide-react'

const CATEGORIES = ['산책', '등산', '여행', '사진', '요리', '음악', '서예', '탁구']

export default function NewGroupPage() {
  const supabase = createClient()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('산책')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.replace('/login')
      const { data: profile } = await supabase.from('profiles').select('region').eq('user_id', auth.user.id).maybeSingle()
      if (profile?.region) setRegion(profile.region)
      setReady(true)
    })()
  }, [router, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('모임 이름을 입력해 주세요.')
    if (!region.trim()) return setError('지역을 입력해 주세요. (예: 서울 마포구)')
    if (maxMembers < 2) return setError('정원은 2명 이상이어야 해요.')

    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) return router.replace('/login')

      const insertPayload = {
        title: title.trim(), category, region: region.trim(),
        description: description.trim(), max_members: maxMembers, owner_user_id: user.id,
      }

      const { data: created, error: insertError } = await supabase.from('groups').insert(insertPayload).select('id').single()
      if (insertError) throw new Error(`[${insertError.code ?? '?'}] ${insertError.message}${insertError.details ? ` · ${insertError.details}` : ''}${insertError.hint ? ` · ${insertError.hint}` : ''}`)
      if (!created) throw new Error('모임 생성 결과를 확인할 수 없어요.')

      const { error: joinError } = await supabase.from('group_members').upsert({ group_id: created.id, user_id: user.id, role: 'owner' }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
      if (joinError) throw new Error(`[${joinError.code ?? '?'}] ${joinError.message}${joinError.details ? ` · ${joinError.details}` : ''}`)

      router.replace(`/groups/${created.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 py-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/30">
        <Link href="/groups" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-border/50 text-foreground">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-bold text-lg">모임 만들기</h1>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-6">
        <p className="text-muted-foreground font-medium mb-6">
          관심사가 비슷한 분들과 함께할 모임을 만들어 보세요.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
              <AlignLeft size={15} className="text-primary" />
              모임 이름
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="예: 아침 산책 모임"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
              <Tag size={15} className="text-primary" />
              카테고리
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    category === c
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-foreground border-border/60 hover:border-primary/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
              <MapPin size={15} className="text-primary" />
              지역(구/동)
            </label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="예: 서울 마포구"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
              <AlignLeft size={15} className="text-primary" />
              모임 소개
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground min-h-32 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="어떤 모임인지 소개해 주세요."
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
              <Users size={15} className="text-primary" />
              정원 (명)
            </label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-border/60 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              min={2}
              max={500}
            />
          </div>

          {error && <p className="text-red-500 font-medium text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? '생성 중...' : '모임 만들기'}
          </button>
        </form>
      </main>
    </div>
  )
}
