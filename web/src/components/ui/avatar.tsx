import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

/**
 * Avatar
 * Radix UI Avatar 기반. 이미지 로드 실패 시 Fallback(이니셜) 자동 표시.
 *
 * 사용 예시:
 *   <Avatar>
 *     <AvatarImage src={user.avatarUrl} alt={user.nickname} />
 *     <AvatarFallback>산</AvatarFallback>
 *   </Avatar>
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClass = {
    sm: 'h-9 w-9 text-sm',    // 36px
    md: 'h-11 w-11 text-base', // 44px — 기본
    lg: 'h-14 w-14 text-lg',  // 56px
    xl: 'h-20 w-20 text-2xl', // 80px — 프로필 상세
  }[size]

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClass,
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full',
      'bg-blue-100 text-blue-700 font-bold',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
