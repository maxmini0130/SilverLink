'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────
// 모임 참여
// ─────────────────────────────────────────────────────
export async function joinGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요해요' }

  // 1. 모임 멤버 추가
  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id, role: 'member' })

  if (joinError && joinError.code !== '23505') {
    // 23505 = unique_violation (이미 참여중)
    return { error: joinError.message }
  }

  // 2. 모임 채팅방 조회 (RLS: 모임 멤버도 조회 가능하도록 rls.sql 업데이트 필요)
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'group')
    .eq('group_id', groupId)
    .maybeSingle()

  let conversationId: string | undefined = existingConv?.id

  // 3. 채팅방이 없으면 새로 생성
  if (!conversationId) {
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'group', group_id: groupId })
      .select('id')
      .single()

    if (convError) {
      // 동시 생성 레이스 컨디션 — 재조회
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .eq('group_id', groupId)
        .maybeSingle()
      conversationId = retry?.id
    } else {
      conversationId = newConv?.id
    }
  }

  // 4. 대화방 멤버 추가 (이미 있으면 무시)
  if (conversationId) {
    try {
      await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, user_id: user.id })
    } catch {
      /* 이미 멤버 — 무시 */
    }
  }

  revalidatePath(`/groups/${groupId}`)
  return {}
}

// ─────────────────────────────────────────────────────
// 모임 탈퇴
// ─────────────────────────────────────────────────────
export async function leaveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요해요' }

  // 채팅방 멤버에서도 제거
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'group')
    .eq('group_id', groupId)
    .maybeSingle()

  if (conv?.id) {
    await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conv.id)
      .eq('user_id', user.id)
  }

  // 모임 멤버에서 제거
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/groups/${groupId}`)
  return {}
}
