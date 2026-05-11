# context.md — 골든매치

> Update note: 추가/변경 시 맨 아래 "Last Updated" 라인을 갱신할 것.

## 공유 스키마 위치
- `packages/schema/src/index.ts` 가 단일 export. 모든 타입/상수는 여기서 re-export.
  - `DeptEnum` (11종 진료과)
  - `DISCLAIMER` 상수 — "본 서비스는 의료행위가 아니며 응급실 안내·길찾기 보조 도구입니다."
  - `ESCALATE_MESSAGE` 상수 — "지금은 119를 부르고 기다려주세요"
  - `KAKAO_ROUTE_WEB_FALLBACK(name, lat, lng)` 빌더 함수 — `https://map.kakao.com/link/to/{name},{lat},{lng}`
- FE는 path alias `@schema` 로 import. tsconfig.base에 paths 등록.

## 외부 API 엔드포인트
- Groq: `POST https://api.groq.com/openai/v1/chat/completions` (stream:true, tools 배열, `model:"openai/gpt-oss-20b"`, `reasoning_effort:"low"`, `temperature:0.2`, `max_tokens:160`)
- Kakao Local 주소검색: `GET https://dapi.kakao.com/v2/local/search/address.json?query=...` (Header `Authorization: KakaoAK ${KAKAO_REST_API_KEY}`)
- Kakao Local 키워드검색: `GET https://dapi.kakao.com/v2/local/search/keyword.json?query=...`
- Kakao Local coord→region: `GET https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=lng&y=lat`
- Kakao Mobility Directions: `GET https://apis-navi.kakaomobility.com/v1/directions?origin={x,y}&destination={x,y}&priority=TIME` (Header 동일 KakaoAK)
- 공공데이터 응급의료 Base: `https://apis.data.go.kr/B552657/ErmctInfoInqireService`
  - `/getEgytListInfoInqire` — 기본 목록 (이름·주소·전화·`wgs84Lat`·`wgs84Lon`)
  - `/getEmrrmRltmUsefulSckbdInfoInqire` — 가용 병상 (`hvec` 등)
  - `/getSrsillDissAceptncPosblInfoInqire` — 중증 수용 가능 플래그
  - 공통 쿼리: `serviceKey`, `STAGE1`(시도), `STAGE2`(시군구), `pageNo`, `numOfRows`, `_type=json`
  - hpid로 left-join. STAGE2 빔 → STAGE1만 재시도.

## 시스템 프롬프트 핵심 (BE-B 책임)
- 페르소나: 응급실 라우팅 행정 보조자. 진단·처치 안내 금지.
- 응답: 1턴 2문장 이내, 한국어 존댓말.
- 최소 수집: (의식 or 호흡) + 주증상 1개. 최대 3턴. "모르겠어요" 답이면 더 캐묻지 않음.
- 위치 폴백: "OO동/근처 큰 건물"이면 충분.
- self-transport 위험 신호 감지 시 즉시 `escalate_to_119` tool call.

## Tool 스키마 (OpenAI function-tool 포맷)
- `finalize_query` args: `{ location_text: string, suspected_dept: DeptEnum, severity_hints: string[] }`
- `escalate_to_119` args: `{ reason_label: "의식"|"호흡"|"출혈"|"경련"|"외상"|"영유아"|"임신후기"|"기타", location_text: string }`

## SSE 컨벤션 (`/api/chat`)
- 일반 토큰: 그대로 `data: <chunk>\n\n` 흘려보냄.
- tool 완성 시 별도 라인 `event: tool\ndata: {"name":"...","args":{...}}\n\n` 한 번 emit 후 스트림 close.
- FE는 EventSource가 아닌 `fetch+ReadableStream` 사용 (POST + 헤더 필요).

## 스코어링 가중치
- 일반: `w_avail=2, w_dept=1.5, w_accept=1, w_eta=0.2`
- beds는 후보 max로 0~1 정규화, eta는 분 그대로 차감.
- 좌표 없으면 `w_eta=0`. 동률: beds desc → eta asc. 가용 0/수용불가는 차순위로만.

## 응답 스키마 (사용자 명세 그대로)
- `/api/match` → `{ primary, alternatives[<=2], patient:{location_text,lat?,lng?,suspected_dept}, disclaimer }`
- `/api/escalate` → `{ reason_label, reference_center:{name,address,phone}, message: ESCALATE_MESSAGE, disclaimer }`

## 환경 변수
- 서버 전용: `GROQ_API_KEY`, `KAKAO_REST_API_KEY` (Local + Mobility 공용), `DATA_GO_KR_SERVICE_KEY`
- 클라: `VITE_API_BASE`, `VITE_KAKAO_JS_KEY` (도메인 화이트리스트)
- 누락 키일 때 서버는 5xx 대신 4xx + 한국어 메시지.

## 카카오 딥링크 (FE)
- 시도 1: `kakaomap://route?sp={sx},{sy}&ep={ex},{ey}&by=CAR`
- ~1s 내 미열림 → `https://map.kakao.com/link/to/{encodeURIComponent(name)},{lat},{lng}` 로 폴백.
- 출발지 좌표 없으면 시도 1 생략하고 바로 폴백.

## 데모 시나리오 (Tester 체크)
- A 자차 가능: "할머니 손목 부어요, 신림동" → 결과 카드.
- B 강제 escalate: "아이가 의식이 없어요" → /escalate, 매칭 카드 미노출.
- C 좌표 없음: "신림동" 텍스트만 → 카드 도달, eta_min 부재, beds/accept만으로 정렬.

Last Updated: Lead — 초기 컨텍스트 정리, schema/외부 API 엔드포인트/스코어링/SSE 컨벤션 동결.
Last Updated: Backend — Hono/Bun API 전체 구현 (chat SSE+tools, match scoring+NEMC 3-op left-join, escalate 권역센터 폴백, ratelimit 60/min, Kakao Local/Mobility fail-soft, 한국어 4xx 에러).
Last Updated: Frontend — apps/web 부트스트랩(Vite+React18+TS+Tailwind+Router). Home/Chat/Escalate 페이지, ResultCard/LocationInput/ChatStream/Disclaimer, SSE 클라이언트(lib/sse), api 래퍼(lib/api), 카카오 딥링크(lib/kakaoLink), geolocation(lib/geo) 구현.
