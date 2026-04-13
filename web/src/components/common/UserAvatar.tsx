import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

/**
 * UserAvatar
 * 프로필 데이터를 받아서 아바타 이미지 or 닉네임 첫 글자 fallback을 보여줌.
 *
 * 사용 예시:
 *   <UserAvatar nickname="산들바람" avatarUrl={user.avatarUrl} size="lg" />
 */
interface UserAvatarProps {
  nickname: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function UserAvatar({
  nickname,
  avatarUrl,
  size = 'md',
  className,
}: UserAvatarProps) {
  // 닉네임 첫 글자를 fallback으로 사용
  const initial = nickname?.charAt(0) ?? '?'

  return (
    <Avatar size={size} className={className}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={`${nickname}님의 프로필 사진`} />
      )}
      <AvatarFallback aria-label={`${nickname}님`}>
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
