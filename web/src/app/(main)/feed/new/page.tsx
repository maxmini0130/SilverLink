'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { VISIBILITY_LABEL } from '@/lib/constants'

// ─────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────

const CONTENT_MAX = 200

type VisibilityLevel = 'only_me' | 'friends_only' | 'same_region' | 'same_group' | 'all_members'

const VISIBILITY_OPTIONS: VisibilityLevel[] = [
  'all_members',
  'same_region',
  'same_group',
  'friends_only',
  'only_me',
]

// ─────────────────────────────────────────────────────
// 새 피드 작성 페이지
// ─────────────────────────────────────────────────────

export default function FeedNewPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<VisibilityLevel>('all_members')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSelectImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    setError(null)
    if (!imageFile) { setError('사진을 선택해주세요.'); return }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return }

    setSubmitting(true)

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) { setError('로그인이 필요해요.'); setSubmitting(false); return }

    // 1. 이미지 업로드 (posts 버킷)
    const ext = imageFile.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('posts')
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false })

    if (uploadError) {
      setError(`이미지 업로드 실패: ${uploadError.message}`)
      setSubmitting(false)
      return
    }

    const { data: publicUrl } = supabase.storage.from('posts').getPublicUrl(uploadData.path)
    const imageUrl = publicUrl.publicUrl

    // 2. 게시물 저장
    const { error: insertError } = await supabase.from('posts').insert({
      author_id: userId,
      content: content.trim(),
      image_url: imageUrl,
      visibility,
    })

    if (insertError) {
      setError(`저장 실패: ${insertError.message}`)
      setSubmitting(false)
      return
    }

    router.replace('/feed')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-2 h-14 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="뒤로"
          disabled={submitting}
        >
          <ChevronLeft size={26} />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">새 피드 작성</h1>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !imageFile || !content.trim()}
        >
          {submitting ? '올리는 중...' : '올리기'}
        </Button>
      </header>

      <div className="px-4 pt-5 space-y-6 pb-10">

        {/* 사진 선택 */}
        <section>
          <p className="text-base font-bold text-gray-800 mb-3">
            사진 <span className="text-red-500">*</span>
          </p>

          {imagePreview ? (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-3 right-3 bg-black/50 rounded-full p-1.5"
                aria-label="사진 제거"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 active:bg-gray-100 transition-colors"
            >
              <Camera size={40} className="text-gray-300" />
              <span className="text-base text-gray-400">사진을 선택하세요</span>
              <span className="text-sm text-gray-300">JPG, PNG, WEBP · 최대 5MB</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onSelectImage}
          />
        </section>

        {/* 내용 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-bold text-gray-800">
              내용 <span className="text-red-500">*</span>
            </p>
            <span
              className={`text-sm tabular-nums ${
                content.length >= CONTENT_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'
              }`}
            >
              {content.length}/{CONTENT_MAX}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
            placeholder="오늘 하루 어떠셨나요? 이웃들과 나눠보세요 😊"
            rows={5}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-relaxed resize-none outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-gray-400"
          />
        </section>

        {/* 공개 범위 */}
        <section>
          <p className="text-base font-bold text-gray-800 mb-3">공개 범위</p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors',
                  visibility === v
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center',
                    visibility === v ? 'border-blue-500' : 'border-gray-300',
                  ].join(' ')}
                >
                  {visibility === v && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  )}
                </div>
                <span
                  className={`text-base ${
                    visibility === v ? 'text-blue-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  {VISIBILITY_LABEL[v]}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 에러 */}
        {error && (
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
