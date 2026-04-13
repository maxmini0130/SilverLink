import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { RelationshipActions } from '@/components/relationship-actions'
import { SafetyActions } from '@/components/safety-actions'

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data: block } = await supabase
    .from('blocks')
    .select('blocker_user_id')
    .or(`and(blocker_user_id.eq.${auth.user.id},blocked_user_id.eq.${id}),and(blocker_user_id.eq.${id},blocked_user_id.eq.${auth.user.id})`)
    .maybeSingle()

  if (block) {
    return (
      <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
        <Link href="/people" style={{ textDecoration: 'underline', color: '#57534e' }}>
          ← 사람 목록
        </Link>
        <div style={{ marginTop: 16, padding: 24, borderRadius: 20, border: '1px solid #e7e5e4', background: '#fff' }}>
          차단 관계가 있어 이 프로필을 볼 수 없습니다.
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id,nickname,age_band,region,hobbies,relationship_purpose,bio,avatar_url')
    .eq('user_id', id)
    .maybeSingle()

  if (!profile) notFound()

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <Link href="/people" style={{ textDecoration: 'underline', color: '#57534e' }}>
        ← 사람 목록
      </Link>

      <section
        style={{
          marginTop: 16,
          padding: 24,
          borderRadius: 20,
          border: '1px solid #e7e5e4',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <ProfileAvatar avatarUrl={profile.avatar_url} nickname={profile.nickname} />
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>{profile.nickname}</h1>
            <p style={{ marginTop: 8, color: '#57534e' }}>
              {[profile.age_band, profile.region].filter(Boolean).join(' · ') || '기본 정보 준비 중'}
            </p>
            {profile.relationship_purpose && (
              <p style={{ marginTop: 10, fontSize: 17 }}>관계 목적: {profile.relationship_purpose}</p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
          <section>
            <div style={{ fontSize: 18, fontWeight: 700 }}>자기소개</div>
            <p style={{ marginTop: 8, color: '#44403c' }}>
              {profile.bio?.trim() || '아직 자기소개를 작성하지 않았어요.'}
            </p>
          </section>

          <section>
            <div style={{ fontSize: 18, fontWeight: 700 }}>관심사</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(profile.hobbies ?? []).length > 0 ? (
                profile.hobbies?.map((hobby) => (
                  <span
                    key={hobby}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: '#f5f5f4',
                    }}
                  >
                    {hobby}
                  </span>
                ))
              ) : (
                <span style={{ color: '#57534e' }}>관심사 정보가 아직 없어요.</span>
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 16,
            background: '#fafaf9',
            border: '1px solid #e7e5e4',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>다음 단계</div>
          <RelationshipActions targetUserId={profile.user_id} />
          <SafetyActions targetUserId={profile.user_id} />
        </div>
      </section>

      <AppNav />
    </div>
  )
}

function ProfileAvatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null
  nickname: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${nickname} 프로필 사진`}
        style={{
          width: 108,
          height: 108,
          borderRadius: '50%',
          objectFit: 'cover',
          background: '#e7e5e4',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: 108,
        height: 108,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#d6d3d1',
        color: '#1c1917',
        fontSize: 42,
        fontWeight: 700,
      }}
    >
      {nickname.slice(0, 1)}
    </div>
  )
}
