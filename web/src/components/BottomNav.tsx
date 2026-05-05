'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: '홈', icon: '⌂' },
  { href: '/people', label: '사람', icon: '♡' },
  { href: '/groups', label: '모임', icon: '◎' },
  { href: '/messages', label: '대화', icon: '▱' },
  { href: '/notifications', label: '알림', icon: '!' },
  { href: '/me', label: '내정보', icon: '○' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      aria-label="주요 메뉴"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--nav-height)',
        background: 'white',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              textDecoration: 'none',
              color: active ? 'var(--primary)' : 'var(--muted)',
              minHeight: 'var(--nav-height)',
              fontWeight: active ? 700 : 500,
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 11, lineHeight: 1.2 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
