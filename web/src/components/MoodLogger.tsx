'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MOODS = [
  { score: 1, emoji: '😢', label: '매우 힘들어요' },
  { score: 2, emoji: '😔', label: '좀 힘들어요' },
  { score: 3, emoji: '😐', label: '보통이에요' },
  { score: 4, emoji: '😊', label: '좋아요' },
  { score: 5, emoji: '😄', label: '매우 좋아요' },
]

export default function MoodLogger({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveMood() {
    if (!selected) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('mood_logs').upsert({
      user_id: userId,
      mood_score: selected,
      log_date: today,
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>오늘 기분이 어떠세요?</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        {MOODS.map((m) => (
          <button
            key={m.score}
            onClick={() => setSelected(m.score)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 8px',
              borderRadius: 12,
              border: selected === m.score ? '2px solid var(--primary)' : '2px solid transparent',
              background: selected === m.score ? '#eff6ff' : 'transparent',
              cursor: 'pointer',
              minHeight: 'auto',
              flex: 1,
            }}
          >
            <span style={{ fontSize: 28 }}>{m.emoji}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>{m.label}</span>
          </button>
        ))}
      </div>
      <button
        className="btn-primary"
        onClick={saveMood}
        disabled={!selected || saving}
        style={{ marginTop: 0 }}
      >
        {saving ? '저장 중...' : '오늘 기분 기록하기'}
      </button>
    </div>
  )
}
