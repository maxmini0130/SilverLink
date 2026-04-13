// 대화 목록 페이지 (MVP 준비 중)

export default function ChatsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <h1 className="text-xl font-bold text-gray-900">대화</h1>
      </header>

      <div className="py-20 flex flex-col items-center gap-3 text-center px-6">
        <span className="text-5xl">💬</span>
        <p className="text-lg font-medium text-gray-700">대화 기능 준비 중이에요.</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          1촌 친구와의 1:1 대화 기능이<br />곧 추가될 예정이에요.
        </p>
      </div>
    </div>
  )
}
