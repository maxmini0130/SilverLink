# SilverLink 프로젝트

## 서비스 정의
시니어를 위한 미니홈피형 관계 서비스.
노골적인 소개팅 앱이 아니라, 친구·말벗·동행이 
자연스럽게 이어지는 안심형 플랫폼.

## 핵심 원칙
- 댓글 기능 없음 (반응 버튼만 허용)
- DM은 상호관심 / 1촌 / 같은 모임일 때만 가능
- 공개범위: 나만보기 / 1촌만 / 관심있는사람 / 같은모임 / 전체인증회원
- 외부 웹 완전공개 없음 (인증회원만 열람)
- 시니어 친화 UX (버튼 크게, 글자 크게, 선택지 적게)

## 기술 스택
- Frontend: Next.js App Router + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Backend: Supabase (Auth / DB / Storage)
- 상태관리: Zustand
- 폼: React Hook Form + Zod
- 배포: Vercel

## 폴더 구조
- src/app → 페이지 라우팅
- src/components → UI 컴포넌트
- src/lib/supabase → Supabase 클라이언트
- src/services → 비즈니스 로직
- src/types → 타입 정의
- src/stores → Zustand 상태

## MVP 핵심 기능
1. 회원가입 / 로그인 (Supabase Auth)
2. 프로필 (사진, 닉네임, 지역, 관심사, 관계목적)
3. 생활 피드 (사진 + 짧은글 + 공개범위)
4. 사람 찾기 / 추천
5. 관심 보내기 / 1촌
6. 제한형 DM
7. 모임 (목록 / 상세 / 참여)
8. 신고 / 차단

## MVP 제외 기능
결제, 프리미엄, 광고, 음성메시지, AI챗봇,
보호자기능, 건강기능, 여행상품 연계

## 코딩 규칙
- 한 번에 너무 많은 파일 만들지 않기
- 파일 구조 먼저 보여주고 코드 작성
- 더미데이터와 실제 API 연결 코드 구분
- 모바일 우선 UI
- 시니어 친화: 버튼 최소 48px, 텍스트 16px 이상
- 과도한 추상화 금지