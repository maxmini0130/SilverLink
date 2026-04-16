import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { targetUserId?: string } | null
  const targetUserId = body?.targetUserId

  if (!targetUserId) {
    return NextResponse.json({ error: '대화 상대 정보가 필요합니다.' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: '자기 자신과는 대화할 수 없습니다.' }, { status: 400 })
  }

  const { data: block } = await supabase
    .from('blocks')
    .select('blocker_user_id')
    .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${targetUserId}),and(blocker_user_id.eq.${targetUserId},blocked_user_id.eq.${user.id})`)
    .maybeSingle()

  if (block) {
    return NextResponse.json({ error: '차단 관계에서는 대화를 시작할 수 없습니다.' }, { status: 403 })
  }

  const [sentRes, receivedRes, friendRes, myMembershipsRes, targetMembershipsRes] = await Promise.all([
    supabase
      .from('relationship_requests')
      .select('requester_user_id')
      .eq('requester_user_id', user.id)
      .eq('target_user_id', targetUserId)
      .maybeSingle(),
    supabase
      .from('relationship_requests')
      .select('requester_user_id')
      .eq('requester_user_id', targetUserId)
      .eq('target_user_id', user.id)
      .maybeSingle(),
    supabase
      .from('friendships')
      .select('user_low_id')
      .eq('user_low_id', orderedIds(user.id, targetUserId).low)
      .eq('user_high_id', orderedIds(user.id, targetUserId).high)
      .maybeSingle(),
    supabase.from('group_members').select('group_id').eq('user_id', user.id),
    supabase.from('group_members').select('group_id').eq('user_id', targetUserId),
  ])

  const myGroupIds = new Set((myMembershipsRes.data ?? []).map((row) => row.group_id as string))
  const sharedGroupCount = (targetMembershipsRes.data ?? []).filter((row) =>
    myGroupIds.has(row.group_id as string)
  ).length

  const isMutualInterest = !!sentRes.data && !!receivedRes.data
  const canChat = !!friendRes.data || isMutualInterest || sharedGroupCount > 0

  if (!canChat) {
    return NextResponse.json(
      { error: '상호 관심, 1촌, 같은 모임 조건을 만족해야 대화를 시작할 수 있습니다.' },
      { status: 403 }
    )
  }

  const { data: myMemberships, error: myMembershipError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (myMembershipError) {
    return NextResponse.json({ error: myMembershipError.message }, { status: 500 })
  }

  const myConversationIds = (myMemberships ?? []).map((row) => row.conversation_id as string)

  if (myConversationIds.length > 0) {
    const { data: existingMembership } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', targetUserId)
      .in('conversation_id', myConversationIds)
      .maybeSingle()

    if (existingMembership?.conversation_id) {
      return NextResponse.json({ conversationId: existingMembership.conversation_id })
    }
  }

  console.log('[api/conversations] creating as', user.id, '→', targetUserId)

  const { data: conversationId, error: rpcError } = await supabase.rpc('start_direct_conversation', {
    target: targetUserId,
  })

  if (rpcError || !conversationId) {
    console.error('[api/conversations] rpc failed', rpcError)
    return NextResponse.json(
      {
        error: rpcError?.message ?? '대화 생성에 실패했습니다.',
        code: rpcError?.code,
        details: rpcError?.details,
        hint: rpcError?.hint,
      },
      { status: 500 },
    )
  }

  console.log('[api/conversations] created', conversationId)

  return NextResponse.json({ conversationId })
}

function orderedIds(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a }
}
