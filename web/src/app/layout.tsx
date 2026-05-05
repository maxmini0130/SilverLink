import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'WithDay',
  description: '중장년과 시니어를 위한 안전한 인연과 모임 서비스',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={geist.variable}>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
