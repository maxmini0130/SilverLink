import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | { targetUserId?: string; action?: 'block' | 'unblock' }
    | null

  const targetUserId = body?.targetUserId
  const action = body?.action ?? 'block'

  if (!targetUserId) {
    return NextResponse.json({ error: '대상 사용자가 필요합니다.' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: '자기 자신은 차단할 수 없습니다.' }, { status: 400 })
  }

  if (action === 'unblock') {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_user_id', user.id)
      .eq('blocked_user_id', targetUserId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ blocked: false })
  }

  const { error } = await supabase.from('blocks').insert({
    blocker_user_id: user.id,
    blocked_user_id: targetUserId,
  })

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ blocked: true })
}
