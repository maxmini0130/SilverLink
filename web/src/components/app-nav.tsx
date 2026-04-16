import Link from 'next/link'

const LINKS = [
  { href: '/', label: '홈' },
  { href: '/posts', label: '피드' },
  { href: '/people', label: '사람' },
  { href: '/groups', label: '모임' },
  { href: '/messages', label: '대화' },
  { href: '/relationships', label: '관계' },
  { href: '/notifications', label: '알림' },
  { href: '/me', label: '마이' },
]

export function AppNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-border/50">
      <div className="flex items-center justify-center gap-1 px-2 py-3 max-w-2xl mx-auto">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex-1 flex items-center justify-center py-2 px-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
