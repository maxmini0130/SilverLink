import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button
 *
 * 시니어 친화 기준:
 * - 기본 높이 48px (min 터치 영역)
 * - 기본 폰트 16px
 * - 명확한 hover / active 피드백
 * - 라운드 처리
 *
 * 사용 예시:
 *   <Button>관심 보내기</Button>
 *   <Button variant="outline" size="lg">프로필 보기</Button>
 *   <Button variant="ghost" size="sm">취소</Button>
 *   <Button variant="destructive">신고하기</Button>
 */
const buttonVariants = cva(
  // 공통 기반
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-xl',
    'transition-all duration-150 active:scale-95',
    'disabled:pointer-events-none disabled:opacity-40',
    'cursor-pointer select-none',
    // 포커스 접근성
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        // 주 액션 (관심 보내기, 참여하기, 저장)
        default:
          'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800',

        // 보조 액션 (프로필 보기, 더보기)
        outline:
          'border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 active:bg-blue-100',

        // 3순위 액션 (취소, 뒤로)
        ghost:
          'text-gray-600 hover:bg-gray-100 active:bg-gray-200',

        // 위험 액션 (신고, 차단, 삭제)
        destructive:
          'bg-red-500 text-white shadow-sm hover:bg-red-600 active:bg-red-700',

        // 보조 배경 (비활성 표시, 완료 상태)
        secondary:
          'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
      },
      size: {
        // 시니어 친화: 기본이 48px (일반 shadcn default인 36px보다 큼)
        sm:      'h-10 px-4 text-sm rounded-lg',      // 40px — 보조 버튼
        default: 'h-12 px-5 text-base',               // 48px — 표준
        lg:      'h-14 px-6 text-lg rounded-2xl',     // 56px — 주요 CTA
        icon:    'h-12 w-12',                          // 아이콘 전용 (48x48)
        'icon-sm': 'h-10 w-10',                        // 작은 아이콘
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
