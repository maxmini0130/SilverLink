export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type NotificationRow = {
  id: number
  type: 'interest' | 'interest_accepted' | 'post_reaction' | 'message'
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

async function markAllRead() {
  'use server'

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', auth.user.id)
    .is('read_at', null)

  revalidatePath('/notifications')
  revalidatePath('/')
}

function typeLabel(type: NotificationRow['type']) {
  if (type === 'interest') return '관심'
  if (type === 'interest_accepted') return '연결'
  if (type === 'post_reaction') return '반응'
  return '대화'
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, href, read_at, created_at')
    .eq('recipient_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as NotificationRow[]
  const unreadCount = notifications.filter((item) => !item.read_at).length

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>알림</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
            관심, 반응, 대화 소식을 모아볼 수 있어요.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button className="btn-outline" style={{ padding: '10px 14px', fontSize: 15, whiteSpace: 'nowrap' }}>
              모두 읽음
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          아직 새 알림이 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map((item) => {
            const content = (
              <div
                className="card"
                style={{
                  padding: 16,
                  borderColor: item.read_at ? 'var(--border)' : 'var(--primary)',
                  background: item.read_at ? 'var(--surface)' : '#eff6ff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 800 }}>{typeLabel(item.type)}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{item.title}</div>
                {item.body && <div style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>{item.body}</div>}
              </div>
            )

            return item.href ? (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
