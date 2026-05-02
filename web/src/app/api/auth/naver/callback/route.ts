import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=naver_denied`)
  }

  // 1. 네이버 액세스 토큰 교환
  const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NAVER_CLIENT_ID!,
      client_secret: process.env.NAVER_CLIENT_SECRET!,
      code,
      state: state ?? '',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=naver_token`)
  }

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${origin}/login?error=naver_token`)
  }

  // 2. 네이버 사용자 정보 조회
  const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=naver_profile`)
  }

  const profileData = await profileRes.json()
  const naverUser = profileData.response
  const email = naverUser?.email

  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=naver_email`)
  }

  // 3. Supabase 어드민으로 매직링크 생성 (사용자 없으면 자동 생성)
  const admin = createAdminClient()
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${origin}/auth/callback`,
      data: {
        full_name: naverUser.name ?? '',
        avatar_url: naverUser.profile_image ?? '',
        provider: 'naver',
        naver_id: naverUser.id ?? '',
      },
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.redirect(`${origin}/login?error=naver_link`)
  }

  return NextResponse.redirect(linkData.properties.action_link)
}
