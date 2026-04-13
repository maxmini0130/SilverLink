import Link from 'next/link'

const LINKS = [
  { href: '/', label: '홈' },
  { href: '/posts', label: '피드' },
  { href: '/people', label: '사람' },
  { href: '/groups', label: '모임' },
  { href: '/messages', label: '대화' },
  { href: '/relationships', label: '관계' },
  { href: '/me', label: '마이' },
]

export function AppNav() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 16,
      }}
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid #d6d3d1',
            textDecoration: 'none',
            color: '#1c1917',
            background: '#fafaf9',
            fontWeight: 600,
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
