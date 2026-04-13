import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind 클래스명 병합 유틸
 * clsx(조건부 클래스) + tailwind-merge(충돌 해결) 조합
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
