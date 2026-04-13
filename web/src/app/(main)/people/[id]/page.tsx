'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MoreVertical, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserAvatar from '@/components/common/UserAvatar'
import {
  DUMMY_PEOPLE,
  RelationButton,
  type RelationStatus,
} from '../page'

// ─────────────────────────────────────────────────────
// 프로필 상세 페이지
// ─────────────────────────────────────────────────────

export default function PersonDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  // ⚠️ 더미: DUMMY_PEOPLE에서 조회 — API 연결 시 Supabase 쿼리로 교체
  const person = DUMMY_PEOPLE.find((p) => p.id === id)

  const [relationStatus, setRelationStatus] = useState<RelationStatus>(
    person?.relationStatus ?? 'none',
  )
  const [showActionSheet, setShowActionSheet] = useState(false)

  // 사람 없을 때
  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">🤔</span>
        <p className="text-lg font-medium text-gray-700">
          사용자를 찾을 수 없어요.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-32">

        {/* ── 상단 바 ──────────────────────── */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-2 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="뒤로 가기"
          >
            <ChevronLeft size={26} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActionSheet(true)}
            aria-label="더보기"
          >
            <MoreVertical size={22} />
          </Button>
        </header>

        {/* ── 프로필 헤더 ───────────────────── */}
        <section className="bg-white px-5 pt-8 pb-6 flex flex-col items-center text-center gap-3">

          {/* 아바타 */}
          <UserAvatar
            nickname={person.nickname}
            avatarUrl={person.avatarUrl}
            size="xl"
          />

          {/* 이름 + 기본 정보 */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {person.nickname}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-base text-gray-500">
              <span>{person.ageBand}</span>
              <span className="text-gray-300">·</span>
              <MapPin size={14} className="text-gray-400" />
              <span>{person.regionDistrict}</span>
            </div>
          </div>

          {/* 관계 목적 태그 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {person.purposes.map((p) => (
              <Badge key={p} variant="success" className="text-sm px-3 py-1">
                {p}
              </Badge>
            ))}
          </div>

          {/* 관심사 태그 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {person.hobbies.map((h) => (
              <Badge key={h} variant="default" className="text-sm px-3 py-1">
                {h}
              </Badge>
            ))}
          </div>

          {/* 자기소개 */}
          {person.bio && (
            <p className="text-base text-gray-700 leading-relaxed mt-2 max-w-xs">
              {person.bio}
            </p>
          )}
        </section>

        {/* ── 피드 미리보기 ─────────────────── */}
        <section className="mt-2 bg-white px-4 pt-5 pb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">
            생활 피드
          </h2>

          {person.feedColors.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {person.feedColors.map((color, i) => (
                <div
                  key={i}
                  className={`${color} aspect-square rounded-lg flex items-center justify-center`}
                >
                  <span className="text-xs text-gray-400">사진</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-base text-gray-400">아직 올린 피드가 없어요.</p>
            </div>
          )}
        </section>

      </div>

      {/* ── 하단 액션 바 (BottomNav 위에 고정) ── */}
      {/* bottom-16 = BottomNav 높이(64px) 위에 위치 */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 max-w-lg mx-auto">
        <RelationButton
          status={relationStatus}
          onSendInterest={() => setRelationStatus('sent')}
          personId={person.id}
        />
      </div>

      {/* ── 신고/차단 액션 시트 ──────────────── */}
      {showActionSheet && (
        <ActionSheet
          nickname={person.nickname}
          onClose={() => setShowActionSheet(false)}
        />
      )}
    </>
  )
}

// ─── 신고/차단 액션 시트 ──────────────────────────────

function ActionSheet({
  nickname,
  onClose,
}: {
  nickname: string
  onClose: () => void
}) {
  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 시트 */}
      <div
        role="dialog"
        aria-label="더보기 옵션"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-w-lg mx-auto"
      >
        <div className="px-5 pt-4 pb-8">
          {/* 핸들 바 */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <p className="text-sm text-gray-500 mb-4">
            {nickname}님에 대해 어떤 조치를 하시겠어요?
          </p>

          <div className="space-y-1">
            <ActionSheetButton
              onClick={() => {
                onClose()
                // TODO: 신고 플로우 연결
                alert('신고 기능은 준비 중이에요.')
              }}
              className="text-orange-600"
            >
              🚨 신고하기
            </ActionSheetButton>

            <ActionSheetButton
              onClick={() => {
                onClose()
                // TODO: 차단 API 연결 (blocks 테이블 INSERT)
                alert('차단 기능은 준비 중이에요.')
              }}
              className="text-red-600"
            >
              🚫 차단하기
            </ActionSheetButton>

            <ActionSheetButton
              onClick={onClose}
              className="text-gray-500"
            >
              취소
            </ActionSheetButton>
          </div>
        </div>
      </div>
    </>
  )
}

function ActionSheetButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full py-4 px-4 text-left text-base font-medium rounded-xl',
        'hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[56px]',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
