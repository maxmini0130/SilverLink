import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge — 관심사 태그, 상태 표시, 카테고리 레이블용
 *
 * 사용 예시:
 *   <Badge>등산</Badge>
 *   <Badge variant="outline">사진</Badge>
 *   <Badge variant="success">1촌</Badge>
 *   <Badge variant="destructive">신고됨</Badge>
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        // 관심사 태그, 일반 레이블
        default:
          'bg-blue-50 text-blue-700 text-xs px-2.5 py-1',

        // 외곽선 형태
        outline:
          'border border-gray-300 text-gray-600 text-xs px-2.5 py-1',

        // 성공/완료 상태 (1촌, 참여중)
        success:
          'bg-green-50 text-green-700 text-xs px-2.5 py-1',

        // 경고 (검토중)
        warning:
          'bg-yellow-50 text-yellow-700 text-xs px-2.5 py-1',

        // 위험/오류
        destructive:
          'bg-red-50 text-red-600 text-xs px-2.5 py-1',

        // 회색 (비활성)
        secondary:
          'bg-gray-100 text-gray-500 text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
