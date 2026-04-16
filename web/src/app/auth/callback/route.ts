import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('[auth/callback] hit', { hasCode: !!code, next, origin })

  if (!code) {
    console.warn('[auth/callback] missing code → /login')
    return NextResponse.redirect(`${origin}/login?err=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', {
      message: error.message,
      status: error.status,
      name: error.name,
    })
    return NextResponse.redirect(
      `${origin}/login?err=${encodeURIComponent(error.message)}`,
    )
  }

  console.log('[auth/callback] session established', {
    userId: data.session?.user.id,
    email: data.session?.user.email,
  })
  return NextResponse.redirect(`${origin}${next}`)
}