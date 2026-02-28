import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, nickname')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>SilverLink</h1>
      <p style={{ marginTop: 8 }}>안녕하세요, {profile.nickname}님</p>
      <p style={{ marginTop: 16, opacity: 0.8 }}>
        다음 단계: 기분 체크 + 모임 리스트 + 채팅을 붙일 거예요.
      </p>
    </div>
  )
}