'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'
import { SilverButton } from '@/components/common/silver-button'
import { Users, MapPin, Tag, Plus, ChevronRight, Calendar } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'

type GroupRow = {
  id: string
  title: string
  category: string
  region: string
  description: string
  max_members: number
  created_at: string
}

export default function GroupsPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      const { data, error: qerr } = await supabase
        .from('groups')
        .select('id,title,category,region,description,max_members,created_at')
        .order('created_at', { ascending: false })

      if (qerr) setError(qerr.message)
      setGroups((data ?? []) as GroupRow[])
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div className="p-10 text-center font-bold text-muted-foreground">불러오는 중...</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="max-w-2xl mx-auto px-5 pt-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">모임 찾기</h1>
            <p className="mt-2 text-muted-foreground font-medium">관심사가 비슷한 분들과 함께해 보세요.</p>
          </div>
          <SilverButton size="md" icon={<Plus />} onClick={() => window.location.href='/groups/new'}>
            만들기
          </SilverButton>
        </header>

        <AppNav />

        <div className="space-y-6 mt-8">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="group">
              <article className="bg-white p-6 rounded-[32px] border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase tracking-wider">
                      {g.category}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
                      <MapPin size={12} />
                      {g.region}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                    <Users size={12} />
                    정원 {g.max_members}명
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                    {g.title}
                  </h3>
                  {g.description && (
                    <p className="text-muted-foreground leading-relaxed line-clamp-2 text-[16px]">
                      {g.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(g.created_at).toLocaleDateString('ko-KR')} 개설
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold">
                    상세보기 <ChevronRight size={16} />
                  </div>
                </div>
              </article>
            </Link>
          ))}
          
          {groups.length === 0 && (
            <EmptyState
              icon={Users}
              title="아직 만들어진 모임이 없어요."
              description="직접 모임을 만들어 보세요!"
              action={
                <SilverButton variant="ghost" onClick={() => window.location.href='/groups/new'}>
                  첫 모임 주최하기
                </SilverButton>
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}
