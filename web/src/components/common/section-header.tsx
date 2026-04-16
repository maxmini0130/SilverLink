import Link from 'next/link'
import type { ReactNode } from 'react'

type SectionHeaderProps = {
  title: string
  subtitle?: ReactNode
  moreHref?: string
  moreLabel?: string
}

export function SectionHeader({ title, subtitle, moreHref, moreLabel = '더 보기' }: SectionHeaderProps) {
  return (
    <div className="flex justify-between items-end mb-4 px-1">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {moreHref && (
        <Link
          href={moreHref}
          className="shrink-0 text-sm font-semibold text-primary-foreground bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
        >
          {moreLabel}
        </Link>
      )}
    </div>
  )
}
