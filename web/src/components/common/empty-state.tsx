import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-border">
      {Icon && (
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
          <Icon size={40} />
        </div>
      )}
      <p className="text-foreground font-bold text-lg">{title}</p>
      {description && <p className="text-muted-foreground text-sm mt-2 px-6">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
