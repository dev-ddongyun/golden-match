# 골든매치 (GoldenMatch) — 해커톤 데모 Plan

## 한 줄 목표
보호자가 119를 기다리지 않고 직접 환자를 이송할 수 있도록, AI가 즉시 "지금 갈 수 있는 응급실"을 매칭하고 카카오맵 길찾기로 핸드오프한다. 단, self-transport 위험 신호가 보이면 강제로 119 안내 화면으로 전환한다.

## 기술 스택
- **모노레포**: pnpm workspaces (already bootstrapped — package.json/pnpm-workspace.yaml present)
- **Frontend (`apps/web`)**: Vite + React 18 + TS + React Router + Tailwind, TanStack Query 최소
- **Backend (`apps/api`)**: Hono on Bun runtime (`bun run` dev) — pnpm으로 의존성 관리
- **Shared (`packages/schema`)**: zod 타입/상수 (FE·BE 공유)
- **AI**: Groq `openai/gpt-oss-20b`, streaming, tools(`finalize_query`, `escalate_to_119`)
- **지도**: Kakao Local + Kakao Mobility Directions
- **응급의료**: 공공데이터 15000563 (3 op: list, useful-sickbed, severe-illness-acceptance)

## Role-based 디렉터리
- **Backend** → `apps/api/**`, `packages/schema/src/{chat,match,escalate,dept}.ts`
- **Frontend** → `apps/web/**`, `packages/schema/src/index.ts` (consume only)
- **Lead/Infra** → repo root, `dev/`, `.env.example`, workspace 설정
- **Reviewer/Tester** → 코드 리뷰·시나리오 검증만 (수정 금지)

## Build/Run
```
pnpm install
pnpm dev            # web(:5173) + api(:8787) 동시 기동
pnpm --filter web dev
pnpm --filter api dev
pnpm typecheck
```

## 구현 순서
1. **S1 Lead** — plan/context, packages/schema(zod) 동결, .env.example 확정
2. **S2 병렬**
   - BE-A: `/api/match` — kakao Local·Mobility + NEMC 3 op + scoring
   - BE-B: `/api/chat` (Groq SSE+tools) + `/api/escalate`
   - FE: Home / Chat / Escalate + ResultCard + SSE 클라이언트 + 카카오 딥링크
3. **S3 통합** → **S4 가드레일 리뷰** → **S5 시나리오 3종**
   - A: "할머니 손목 부어요, 신림동" → 카드 도달
   - B: "아이가 의식이 없어요" → 즉시 /escalate
   - C: 텍스트 "신림동"만 → ETA 미표시 카드

## 가드레일 (절대 양보 X)
- self-transport 금지 신호: 의식없음/호흡이상/대량출혈/경련/추락·교통사고 외상/영유아 의식저하/임신후기 출혈 → `escalate_to_119`.
- 처치 질문 회피 문장 단일: "지금은 119 안내를 따라주세요. 저는 갈 응급실을 찾고 있습니다."
- 하단 고지: "본 서비스는 의료행위가 아니며 응급실 안내·길찾기 보조 도구입니다."
- 진료과 enum 11종 (행정 분류, 의학적 판단 아님).
