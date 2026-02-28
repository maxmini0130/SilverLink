# SilverLink MVP — TRD (Technical Requirements Document)

## 1) 기술 스택(고정)

- Front: Next.js (App Router) + TypeScript
- Package Manager: pnpm
- BaaS: Supabase (Auth + PostgreSQL + Realtime + Storage)
- DB: PostgreSQL (Supabase)
- Deploy: Vercel
- 추후 확장(선택): NestJS (API 분리)

## 2) 개발 환경(맥북)

- Node: 20 LTS (프로젝트 루트 `.nvmrc` = 20)
- 실행: `pnpm dev`
- 환경변수(.env.local)
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

## 3) 아키텍처 원칙

- MVP는 “한 레포(Next.js)”에서 최대한 끝낸다.
- 민감/검증 로직만 API Route Handler로 감싼다.
  - 예: 모임 정원 체크, 차단 사용자 필터, 전화번호/계좌 패턴 탐지(경고)

## 4) 권한/보안(최소 원칙)

- Supabase RLS 활성화
- 기본 원칙:
  - profiles: 본인만 insert/update, 읽기는 인증 사용자 범위(민감 필드 없음)
  - groups: 읽기 전체 허용(공개 모임), 생성은 MVP에서 운영자만(권장) 또는 로그인 사용자
  - group_members: 본인만 join, 멤버 조회는 해당 group 멤버만
  - group_messages: **해당 group 멤버만 read/write**
  - mood_logs: 본인만, `unique(user_id, log_date)`로 일 1회 보장
  - reports/blocks: 본인만 생성, reports는 관리자만 전체 조회

## 5) 데이터 모델 (PostgreSQL)

### 테이블(최소)

- profiles(user_id PK, nickname, age_band, region, hobbies[], timestamps)
- groups(id PK, title, category, region, description, owner_user_id, max_members, created_at)
- group_members(PK: group_id+user_id, role, joined_at)
- group_messages(id bigserial PK, group_id, user_id, message, created_at)
- mood_logs(id bigserial PK, user_id, mood(1~5), log_date, created_at, unique(user_id, log_date))
- blocks(PK: blocker_user_id+blocked_user_id, created_at)
- reports(id bigserial PK, reporter_user_id, target_user_id?, group_id?, message_id?, reason, detail, status, created_at)
- events(id bigserial PK, user_id?, event_type, event_time, props jsonb)

### 인덱스(필수)

- groups(region), groups(category)
- group_members(user_id)
- group_messages(group_id, created_at desc)
- mood_logs(user_id, log_date desc)
- reports(status, created_at desc)
- events(event_type, event_time desc), events(user_id, event_time desc)

## 6) 화면별 데이터 접근(쿼리 요약)

### /login

- supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })

### /onboarding

- profiles upsert (본인 user_id 기준)

### / (home)

- 오늘 기분 조회: select from mood_logs where user_id = me and log_date=today
- 추천 모임: region/hobbies 기반 단순 룰(select groups where region=me.region order by created_at desc limit N)
- 이벤트 로깅: home_viewed

### /groups

- groups list: select with filters(region, category)
- group_detail_viewed 이벤트

### /groups/[id]

- group detail: select group by id
- join: insert into group_members(group_id, user_id)
  - (옵션) Route Handler에서 정원 체크 후 insert

### /groups/[id]/chat

- 메시지 리스트: select group_messages where group_id = :id order by created_at asc limit/pagination
- 메시지 전송: insert group_messages(group_id, user_id, message)
- Realtime subscribe: group_messages (group_id filter)
- block 적용(옵션): messages list에서 blocked_user_id 메시지 숨김

### /me

- profiles select/update
- my groups: join group_members + groups
- blocks list

### /admin/reports

- reports list (관리자 권한 필요)
- status update(open/in_review/closed)

## 7) Next.js 프로젝트 구조(권장)

- app/
  - login/page.tsx
  - onboarding/page.tsx
  - page.tsx (home)
  - groups/page.tsx
  - groups/[id]/page.tsx
  - groups/[id]/chat/page.tsx
  - me/page.tsx
  - admin/reports/page.tsx
  - api/
    - group/join/route.ts (선택)
    - message/send/route.ts (선택)
    - report/route.ts (선택)
- lib/
  - supabase/client.ts
  - supabase/server.ts
- middleware.ts (로그인 보호/세션 갱신)

## 8) 이메일 로그인(Passwordless) 설정

- Supabase Auth URL Configuration
  - Local: Site URL = http://localhost:3000
  - Redirect URLs = http://localhost:3000/\*\*
  - Prod: Vercel 도메인 + /\*\* 추가
- 로그인 방식: Magic Link (초기), 필요 시 Email OTP(숫자 코드)로 전환 가능

## 9) PWA(후반 단계)

- Next.js manifest 적용(홈 화면 설치)
- iOS Web Push는 설치형 PWA + OS 제약이 있으므로 MVP 후반/2차에서 검토

## 10) 관측/로깅

- events 테이블에 핵심 이벤트 append-only 저장
- 서버(Route Handler)에는 최소 request log
- (선택) Sentry 도입: 프론트 에러/성능 추적

## 11) 보안/운영 가드레일(최소)

- 메시지 입력에서 전화번호/계좌/카톡ID 패턴 탐지(경고 또는 제한: MVP는 경고부터)
- 신고/차단은 2탭 이내 UI
- 관리자 조치: reports 상태 변경, 필요 시 사용자 정지 플래그(추후 profiles에 컬럼 추가 가능)

## 12) 추후 NestJS 분리 기준(트리거)

- 조건:
  - API 로직이 복잡해짐(정원, 차단, 금칙어, 추천, 스팸 룰)
  - 관리자 기능/운영 자동화 증가
  - 트래픽 증가로 Next 서버 부담 증가
- 분리 대상:
  - group join 검증, message moderation, 신고 처리 자동화, 추천 API, 배치 리포트
- DB는 동일 Postgres 사용, 서비스 계정/권한 분리

## 13) 릴리즈 체크리스트(배포)

- Vercel 환경변수 설정
- Supabase Redirect URL 업데이트
- RLS 정책 적용 확인(모임 채팅 접근 권한)
- 기본 Smoke Test:
  - 신규 로그인 → 온보딩 → 모임 참여 → 채팅 전송 → 기분 체크 저장
