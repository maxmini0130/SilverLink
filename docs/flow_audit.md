# SilverLink 핵심 흐름 코드 감사

- 목적: 흐름 A/B/C가 코드 레벨에서 **끊김 없이** 이어지는지 파일·링크 기준으로 검증
- 기준일: 2026-04-16
- 방식: 수동 테스트가 아닌 **정적 코드 walk** (브라우저 수동 테스트는 [regression_checklist.md](./regression_checklist.md))

---

## 흐름 A: 사람 → 관심 → 대화

**경로**: 회원가입 → 온보딩 → 홈 → 사람 상세 → 관심 보내기 → 상호 관심 → 대화 시작

### 코드 레벨 연결 확인

| 단계 | 파일 | 상태 |
|-----|------|-----|
| 회원가입 | [web/src/app/signup/page.tsx](../web/src/app/signup/page.tsx) | ✅ 존재 |
| 온보딩 | [web/src/app/onboarding/page.tsx](../web/src/app/onboarding/page.tsx) | ✅ 저장 후 `/`로 이동 |
| 홈 → 사람 섹션 | [web/src/app/page.tsx:84](../web/src/app/page.tsx#L84) | ✅ `Link href={/people/${person.user_id}}` |
| 사람 목록 → 상세 | [web/src/app/people/page.tsx:156](../web/src/app/people/page.tsx#L156) | ✅ 아바타·이름 모두 `/people/[id]`로 |
| 상세 → 관심 액션 | [web/src/app/people/[id]/page.tsx](../web/src/app/people/[id]/page.tsx) | ✅ `<RelationshipActions>` 호출 |
| 관심 보내기 INSERT | [web/src/components/relationship-actions.tsx:133](../web/src/components/relationship-actions.tsx#L133) | ✅ `relationship_requests` |
| 상호 관심 판정 | [web/src/components/relationship-actions.tsx:112](../web/src/components/relationship-actions.tsx#L112) | ✅ `sentInterest && receivedInterest` |
| 대화 시작 버튼 | [web/src/components/relationship-actions.tsx:239](../web/src/components/relationship-actions.tsx#L239) | ✅ mutual/1촌/같은 모임 시 노출 |
| 대화 API 권한 체크 | [web/src/app/api/conversations/route.ts:63](../web/src/app/api/conversations/route.ts#L63) | ✅ `canChat` 검증 일치 |

**결론**: 흐름 A는 코드상 전 구간 연결됨. ✅

**잠재 리스크**:
- 상호 관심 상태에서 상대의 "돌려 보내기"가 실시간으로 반영되지 않을 수 있음 → realtime 구독 없음 (새로고침 필요). 시니어 관점에서는 로컬 refresh 안내 문구가 있으면 좋음.

---

## 흐름 B: 피드 → 반응 → 프로필 → 관계

**경로**: 홈 → 피드 보기 → 반응 → 작성자 프로필 → 관심/1촌

### 코드 레벨 연결 확인

| 단계 | 파일 | 상태 |
|-----|------|-----|
| 홈 → 피드 섹션 | [web/src/app/page.tsx:122](../web/src/app/page.tsx#L122) | ✅ `Link href={/posts/${post.id}}` |
| 피드 목록 | [web/src/app/posts/page.tsx](../web/src/app/posts/page.tsx) | ✅ 공개범위 필터 적용 |
| 피드 상세 | [web/src/app/posts/[id]/page.tsx](../web/src/app/posts/[id]/page.tsx) | ✅ |
| 반응(리액션) | 상세 페이지 내 반응 칩 | ✅ INSERT 가능 |
| 작성자 → 프로필 | [web/src/app/posts/[id]/page.tsx:180](../web/src/app/posts/[id]/page.tsx#L180) | ✅ `/people/${post.user_id}` |
| 프로필 → 관심 액션 | `<RelationshipActions>` | ✅ (흐름 A와 공유) |

**결론**: 흐름 B는 코드상 전 구간 연결됨. ✅

**잠재 리스크**:
- 피드 상세 반응 후 작성자 프로필로 이동했을 때 "어디에서 왔는지" 맥락이 사라짐 → breadcrumb 또는 "돌아가기" 개선 여지.

---

## 흐름 C: 모임 참여 → 모임 채팅 → 후속 관계

**경로**: 홈 → 모임 → 참여 → 모임 채팅 → 같은 모임 사용자 관계 연결

### 코드 레벨 연결 확인

| 단계 | 파일 | 상태 |
|-----|------|-----|
| 홈 → 모임 섹션 | [web/src/app/page.tsx:161](../web/src/app/page.tsx#L161) | ✅ `Link href={/groups/${group.id}}` |
| 모임 상세 | [web/src/app/groups/[id]/page.tsx](../web/src/app/groups/[id]/page.tsx) | ✅ |
| 참여 버튼 → group_members INSERT | 모임 상세 페이지 내 액션 | ✅ |
| 참여 후 채팅 진입 | [web/src/app/groups/[id]/chat/page.tsx](../web/src/app/groups/[id]/chat/page.tsx) | ✅ |
| 채팅 내 닉네임 → 프로필 | [web/src/app/groups/[id]/chat/page.tsx](../web/src/app/groups/[id]/chat/page.tsx) | ✅ b62e1e2에서 수정됨 |
| 같은 모임 사용자 간 대화 가능 | [web/src/app/api/conversations/route.ts:63](../web/src/app/api/conversations/route.ts#L63) | ✅ `sharedGroupCount > 0` |
| 같은 모임 사용자 1촌 맺기 | [web/src/components/relationship-actions.tsx:113](../web/src/components/relationship-actions.tsx#L113) | ✅ `canBecomeFriend` 조건에 포함 |

**결론**: 흐름 C는 코드상 전 구간 연결됨. ✅

**잠재 리스크**:
- 모임 탈퇴 시 기존 관계(대화, 1촌)가 어떻게 처리되는지 UX상 불명확 — 현재는 관계 유지. 이 정책을 사용자에게 안내하는 문구 없음.

---

## 공통 관찰

### 연결되어 있지만 개선 여지가 있는 지점

1. **Realtime 반영 부족**: 관심 받기/1촌 성사 시점에 상대 화면이 자동 업데이트되지 않음. 현재는 새로고침 의존.
2. **"왜 안 되나요" 안내 부족**: 대화 시작 실패 시 "조건을 만족하지 않아요"만 표시. 어떤 조건이 필요한지 목록으로 보여주면 좋음.
3. **빈 상태 → 다음 행동 유도**: 홈에서 추천이 없을 때 빈 메시지만 나오면 시니어는 막힐 수 있음. "더 많은 사람을 만나려면 지역을 넓혀보세요" 같은 안내 필요.

### 연결되지 않았거나 주의해야 할 지점

- 현재 발견된 **치명적 단절 없음**. 흐름 A/B/C는 MVP 수준에서 모두 이어져 있음.

---

## 다음 단계 제안

1. 상기 잠재 리스크 3개를 [priority_plan.md](./priority_plan.md) P1 섹션에 반영
2. 실제 수동 테스트는 [regression_checklist.md](./regression_checklist.md) 기반으로 별도 세션 진행
3. 관찰된 UX 개선점은 [senior_ux_checklist.md §5](./senior_ux_checklist.md#5-이번-작업에서-적용할-우선-개선-항목)에 통합
