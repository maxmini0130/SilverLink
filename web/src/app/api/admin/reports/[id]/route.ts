import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: admin, error: adminError } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError || !admin) {
    return NextResponse.json({ error: '관리자만 처리할 수 있습니다.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: 'open' | 'in_review' | 'closed' }
    | null

  if (!body?.status) {
    return NextResponse.json({ error: '상태값이 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('reports')
    .update({ status: body.status })
    .eq('id', Number(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
