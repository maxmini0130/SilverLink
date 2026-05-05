'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_MB = 5

type Props = {
  userId: string
  currentUrl: string | null
  nickname: string
  onUploaded: (url: string) => void
  skipDbUpdate?: boolean
}

export default function AvatarUpload({ userId, currentUrl, nickname, onUploaded, skipDbUpdate = false }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`사진은 ${MAX_SIZE_MB}MB 이하만 올릴 수 있어요.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 올릴 수 있어요.')
      return
    }

    setError(null)
    setUploading(true)

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${userId}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setError('업로드에 실패했어요. 다시 시도해주세요.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

    if (!skipDbUpdate) {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', userId)
      setUploading(false)
      if (dbErr) {
        setError('저장에 실패했어요.')
        return
      }
    } else {
      setUploading(false)
    }

    onUploaded(publicUrl)
  }

  const initials = nickname.slice(0, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid var(--primary)',
          cursor: 'pointer',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          position: 'relative',
        }}
      >
        {preview ? (
          <img src={preview} alt="프로필 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>{initials}</span>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13 }}>업로드 중</span>
          </div>
        )}
      </button>
      <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
        {uploading ? '업로드 중...' : '사진 변경'}
      </span>
      {error && <p style={{ fontSize: 14, color: '#dc2626', margin: 0 }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
