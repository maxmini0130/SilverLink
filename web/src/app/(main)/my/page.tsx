import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UserAvatar from '@/components/common/UserAvatar'
import { AGE_BAND_LABEL, PURPOSE_LABEL } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 마이페이지 (서버 컴포넌트)
// ─────────────────────────────────────────────────────

export default async function MyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, age_band, region_city, region_district, bio, avatar_url, purposes, hobbies')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <h1 className="text-xl font-bold text-gray-900">마이</h1>
      </header>

      <div className="px-4 pt-5 pb-8 space-y-4">
        {/* 프로필 카드 */}
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center text-center gap-3 py-8">
            <UserAvatar
              nickname={profile.nickname}
              avatarUrl={profile.avatar_url}
              size="xl"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.nickname}</h2>
              <p className="text-base text-gray-500 mt-1">
                {AGE_BAND_LABEL[profile.age_band] ?? profile.age_band}
                {' · '}
                {profile.region_district}
              </p>
            </div>

            {(profile.purposes ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {(profile.purposes as string[]).map((p) => (
                  <Badge key={p} variant="success" className="text-sm px-3 py-1">
                    {PURPOSE_LABEL[p] ?? p}
                  </Badge>
                ))}
              </div>
            )}

            {(profile.hobbies ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {(profile.hobbies as string[]).map((h) => (
                  <Badge key={h} variant="default" className="text-sm px-3 py-1">
                    {h}
                  </Badge>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-base text-gray-600 leading-relaxed max-w-xs">{profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* 로그아웃 등 추후 기능 */}
        <div className="pt-4 text-center">
          <p className="text-sm text-gray-400">더 많은 기능이 곧 추가될 예정이에요.</p>
        </div>
      </div>
    </div>
  )
}
