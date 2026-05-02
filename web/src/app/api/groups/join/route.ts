import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { group_id } = await req.json()
  if (!group_id) return NextResponse.json({ error: 'group_id가 필요합니다.' }, { status: 400 })

  // 그룹 존재 및 정원 확인
  const { data: group } = await supabase
    .from('groups')
    .select('id, max_members')
    .eq('id', group_id)
    .maybeSingle()

  if (!group) return NextResponse.json({ error: '모임을 찾을 수 없어요.' }, { status: 404 })

  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group_id)

  if ((count ?? 0) >= group.max_members) {
    return NextResponse.json({ error: '정원이 꽉 찼어요.' }, { status: 409 })
  }

  const { error } = await supabase.from('group_members').insert({
    group_id,
    user_id: auth.user.id,
    role: 'member',
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '이미 참여 중인 모임이에요.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 이벤트 로깅
  await supabase.from('events').insert({
    user_id: auth.user.id,
    event_type: 'group_joined',
    payload: { group_id },
  })

  return NextResponse.json({ success: true })
}
