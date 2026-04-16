import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function SectionCard({ children, className, padding = 'md' }: SectionCardProps) {
  return (
    <article
      className={cn(
        'bg-white rounded-[24px] border border-border/50 shadow-sm',
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </article>
  )
}
