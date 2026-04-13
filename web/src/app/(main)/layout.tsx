import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/BottomNav'

/**
 * (main) 그룹 공통 레이아웃
 * - 모든 (main) 하위 페이지에서 인증 + 온보딩 완료 여부 검사
 * - 미인증 → /login, 프로필 미완성 → /onboarding
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. 인증 확인 (middleware가 1차 방어, 여기서 2차 확인)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. 온보딩 완료 여부 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_onboarded')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_onboarded) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 하단 탭 높이(64px)만큼 여백 확보 */}
      <main className="pb-16 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
