import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'primary' | 'secondary' | 'muted'

type RelationshipBadgeProps = {
  children: ReactNode
  tone?: Tone
  className?: string
}

const toneMap: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  muted: 'bg-muted/60 text-muted-foreground',
}

export function RelationshipBadge({ children, tone = 'neutral', className }: RelationshipBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold',
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
