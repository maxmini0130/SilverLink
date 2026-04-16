# SilverLink Technical Requirements Document (TRD)

## 1. 개요
본 문서는 SilverLink MVP의 기술적 구현 표준과 설계를 정의한다. 시니어 친화적 UX와 안전한 관계 모델을 기술적으로 보장하는 데 목적이 있다.

## 2. 기술 스택 (Tech Stack)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI 기반)
- **Backend/Auth/DB:** Supabase (PostgreSQL)
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod
- **Deployment:** Vercel

## 3. 디자인 시스템 구현 (Tailwind Config)
Design Guide에 기반한 핵심 테마 설정값이다.

### 3.1 Colors
- **Primary:** `#2F6F6D` (Main CTA, Active states)
- **Secondary:** `#E79C7B` (Reactions, Accents)
- **Background:** `#FAF8F5` (Warm tone)
- **Text:** Primary `#222222`, Secondary `#666666`

### 3.2 Typography & Spacing
- **Base Font Size:** 18px (시니어 가독성 확보)
- **Border Radius:** `16px`, `24px` (둥근 카드 UI)
- **Button Height:** Min `48px`, Recommended `52~56px`
- **Container Padding:** `20px`

## 4. 데이터베이스 및 관계 모델 (Supabase RLS)
`relationship_model.md`의 정책을 DB 레벨에서 강제한다.

### 4.1 핵심 테이블
- `profiles`: 기본 사용자 정보 및 공개 설정
- `posts`: 생활 피드 (column: `visibility` - private, friends, interested, same_group, all)
- `relationship_requests`: 관심 상태 (status: pending, mutual)
- `friendships`: 1촌 관계 (bi-directional)
- `group_members`: 모임 참여 정보
- `blocks`: 차단 정보 (모든 조회/대화에서 최우선 필터링)

### 4.2 RLS(Row Level Security) 정책 원칙
1. **차단 우선:** `blocks` 테이블에 데이터가 존재할 경우 상호 간 모든 데이터(프로필, 피드, 대화) 조회 불가.
2. **피드 공개범위:** `posts.visibility` 값과 사용자의 관계 상태(`friendships`, `relationship_requests`, `group_members`)를 Join하여 접근 권한 판단.
3. **대화 권한:** DM 시작 전 서버 사이드(Server Action)에서 상호관심/1촌/같은모임 여부를 검증.

## 5. 핵심 컴포넌트 설계
시니어 UX 원칙(드러난 기능, 큰 영역)을 반영한다.

### 5.1 SilverButton
- 최소 높이 52px 보장.
- 아이콘과 텍스트 병행 표기 필수.
- 클릭 시 확실한 시각적 피드백(Scale down 또는 Color change).

### 5.2 RelationshipBadge
- 관계 상태(1촌, 관심 등)를 캡슐형 UI로 표시.
- 시각적 구분과 함께 텍스트로 상태 명시.

### 5.3 FeedCard
- 사진 영역 최대화 (Aspect ratio 유지).
- 댓글 대신 반응 칩(Reaction Chip) 배치.
- 공개범위 배지 상단 노출.

## 6. 핵심 사용자 흐름 기술 검증 (QA)
`priority_plan.md`의 흐름을 기술적으로 테스트한다.

- **Flow A (사람 중심):** 추천 알고리즘(Random/Recent) -> 관심 Request -> Realtime 알림 -> DM 세션 생성.
- **Flow B (피드 중심):** RLS 필터링된 피드 목록 -> Reaction(Optimistic UI) -> 상대 프로필 진입.
- **Flow C (모임 중심):** 모임 참여 Transaction -> 모임 전용 대화방 권한 획득 -> Realtime 메시징.

## 7. 시니어 UX 기술 체크리스트
- [ ] 텍스트 크기가 15px 이하인 곳이 없는가?
- [ ] 모든 대화식 요소(버튼, 링크)의 터치 영역이 44x44px 이상인가?
- [ ] 중요한 상태 변화(관심 보냄, 참여 완료) 시 토스트나 모달로 명확히 알리는가?
- [ ] 아이콘만 있고 텍스트 설명이 없는 버튼이 있는가?
- [ ] 복잡한 제스처(롱프레스, 스와이프)에만 의존하는 기능이 있는가?

## 8. 향후 확장 고려사항
- 본인인증(PASS/휴대폰) 모듈 연동 구조.
- 이미지 리사이징 및 CDN 적용 (Supabase Storage + Edge Functions).
- 오프라인 모임을 위한 지도 API 연동 준비.
