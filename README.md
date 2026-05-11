# 골든매치 (GoldenMatch)

보호자가 직접 환자를 이송할 때, AI가 지금 갈 수 있는 응급실을 매칭해주는 서비스.

🔗 https://golden-match.vercel.app/

## 동작 흐름

```mermaid
flowchart TD
    A[사용자가 현재 위치와 상태를<br/>AI에게 채팅으로 입력]
    B[AI 대화 진행]
    C{필요 정보<br/>수집 완료?}
    D[응급의료기관 정보 조회 API로<br/>가용 가능한 응급실 파악]
    E[지도 API로 환자 위치에서 후보<br/>응급실까지 거리·교통체증을 종합해<br/>최단 경로 파악]
    F[해당 응급실 전화번호 추출]
    X([위험 신호 감지 시<br/>즉시 119 안내])

    A --> B
    B --> C
    C -- No --> B
    C -- Yes --> D
    D --> E
    E --> F

    A -.위험 신호.-> X
    B -.위험 신호.-> X

    classDef danger fill:#3a1a1a,stroke:#ff5555,color:#ffb4b4
    class X danger
```

위험 신호: 의식없음 / 호흡이상 / 대량출혈 / 경련 / 외상 / 영유아 의식저하 / 임신후기 출혈.

## 사용한 API

| API | 용도 |
|---|---|
| **Groq Chat Completions** (`openai/gpt-oss-20b`) | AI 문진 대화, tool calling 으로 정보 수집 완료/119 강제 분기 판단 |
| **공공데이터 응급의료정보 (NEMC)** | 응급실 목록·가용 병상·중증 수용 가능 여부 조회 (`B552657/ErmctInfoInqireService` 3개 op `hpid` left-join) |
| **Kakao Local** | 사용자 입력 위치(주소·키워드)를 좌표로 변환 |
| **Kakao Mobility Directions** | 환자 위치 → 후보 응급실 ETA·최단 경로 계산 |
| **Kakao Map 딥링크** | 결과 카드에서 카카오맵 길찾기로 핸드오프 |

## 기술 스택

- Frontend: Vite + React 18 + TypeScript + Tailwind
- Backend: Hono on Vercel Functions (Node.js)
- 배포: Vercel
