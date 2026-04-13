'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, CalendarDays, MessageSquare, User } from 'lucide-react'

const TABS = [
  { href: '/',       label: '홈',   icon: Home },
  { href: '/people', label: '사람', icon: Users },
  { href: '/groups', label: '모임', icon: CalendarDays },
  { href: '/chats',  label: '대화', icon: MessageSquare },
  { href: '/my',     label: '마이', icon: User },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-col items-center justify-center gap-1',
                'flex-1 h-full min-h-[48px]',
                'transition-colors duration-150',
                isActive ? 'text-blue-600' : 'text-gray-400',
              ].join(' ')}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 1.5}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
