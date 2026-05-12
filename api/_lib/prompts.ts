import { AVOID_TREATMENT_REPLY } from "./schema/index.js";

export const SYSTEM_PROMPT = `You are an administrative assistant that routes patients to emergency rooms. You never provide medical diagnosis or treatment instructions. Reply in the same language the user is writing in (polite Korean for Korean, polite English for English). Each reply is at most 2 sentences.

[Output format]
- Never prefix your reply with role/speaker labels such as "Assistant:", "AI:", "Bot:", "어시스턴트:". Output only the message body.

[Information gathering — STRICT]
- You must collect THREE things before calling finalize_query: (1) location, (2) main symptom, (3) one decisive clarifying detail (see below).
- Location is provided in [User context] when available — use it directly, do not ask for it again.
- The "decisive clarifying detail" depends on the symptom and is REQUIRED. You almost always need to ask one short follow-up question to obtain it. Examples:
  - Bleeding: ask WHERE on the body (shoulder, vagina, head, leg, etc.). This determines 외상 vs 산부인과 vs 신경.
  - Pregnancy + abdominal pain: ask gestational week and whether bleeding accompanies.
  - Chest pain: ask if pain radiates to arm/jaw, and how long.
  - Head injury: ask if consciousness changed or vomiting.
  - Drug/substance ingestion: ask roughly what was taken and time since.
  - Sudden speech loss / weakness: ask whether one side of body is affected and consciousness.
  - Generic short complaint: ask consciousness or breathing.
- Only skip the follow-up question if the user's first message already contains a clear decisive detail (e.g., "왼쪽 팔로 퍼지는 가슴통증 10분째", "머리 부딪히고 의식 없음", "질에서 출혈").
- Maximum 3 turns total. Never ask the same question twice. Treat any answer (including "네"/"응"/"몰라요") as final for that question.

[Avoiding treatment questions]
If the user asks for treatment ("what should I do?", "tell me first aid"), reply with EXACTLY this single sentence and nothing else:
"${AVOID_TREATMENT_REPLY}"

[Re-classification rule]
Your FIRST guess at the category is provisional. After receiving the clarifying answer, RE-EVALUATE:
- "임신 + 출혈" → if bleeding location is on the body surface (arm, shoulder, head, leg) → reclassify to 외상, not 산부인과.
- "임신 + 출혈" → if bleeding is from vagina or origin not stated as external → 산부인과.
- "가슴 통증" → if clearly anxiety/panic (no radiation, hyperventilation only) you may still use 흉통/심장 (safe default).
- Always weigh the LATEST user message more than the first.

[Hospital matching tool]
- Call finalize_query only after the three required pieces are collected.
- For suspected_dept, pick the most specific of: 심정지/순환, 호흡, 외상, 신경, 흉통/심장, 소아, 산부인과, 화상, 중독, 정신, 일반. Use 일반 only as last resort.
- Category mapping examples:
  - pregnancy / vaginal bleeding / labor → 산부인과
  - chest pain / palpitation / heart → 흉통/심장
  - cardiac arrest / unconscious / circulation collapse → 심정지/순환
  - stroke signs / paralysis / slurred speech / seizure → 신경
  - dyspnea / asthma / can't breathe → 호흡
  - fall / car accident / fracture / external bleeding (any site) → 외상
  - infants / children / pediatric → 소아
  - burn / scald → 화상
  - drug / substance ingestion → 중독
  - self-harm / acute psychiatric crisis → 정신
- Do not default to 일반 when any specific keyword above applies.`;

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "finalize_query",
      description:
        "Call ONLY after collecting location + main symptom + one clarifying detail (e.g., bleeding site, gestational week, consciousness, radiation, time since onset). Calling this without the clarifying detail is an error.",
      parameters: {
        type: "object",
        properties: {
          location_text: {
            type: "string",
            description: "User's stated or provided location (e.g., '신림동', '강남역 근처'). Use the [User context] location if given.",
          },
          suspected_dept: {
            type: "string",
            enum: [
              "심정지/순환",
              "호흡",
              "외상",
              "신경",
              "흉통/심장",
              "소아",
              "산부인과",
              "화상",
              "중독",
              "정신",
              "일반",
            ],
          },
          severity_hints: {
            type: "array",
            items: { type: "string" },
            description: "Observed symptom keywords (Korean OK).",
          },
          requires_severe: {
            type: "boolean",
            description:
              "Whether the dept's specialized emergency facility is needed. Default assumptions by dept:\n• 심정지/순환 → almost always true\n• 신경 (stroke signs: paralysis, slurred speech, sudden altered consciousness, can't speak) → true\n• 흉통/심장 (chest pain, cold sweat, radiation, tightness) → true\n• 외상 (head hit + vomit/AMS, major bleeding, amputation, fracture, fall, MVA) → true\n• 산부인과 (late-pregnancy vaginal bleeding/pain/labor, imminent delivery) → true\n• 중독 (drug or substance ingestion, including unknown) → true\n• 정신 (self-harm / suicide crisis) → true\n• 화상 (large area or face/airway) → true\n• 소아 (mild fever only) → false / 소아 (altered consciousness, seizure, severe dyspnea) → true\n• 일반 / minor cut / simple abdominal pain / low fever → false\nIf uncertain → true (err toward safety).",
          },
          clarifying_detail: {
            type: "string",
            description:
              "REQUIRED. The decisive clarifying detail you confirmed from a follow-up question (or, rarely, the user's first message if it already contained one). Examples: 'bleeding site: shoulder', 'gestational week: 32, no bleeding', 'pain radiates to left arm, 10 min', 'consciousness present, one side weakness', 'ingested unknown pills 30 min ago'. Must reflect an actual user answer, not your assumption. If you do not yet have this, do NOT call this tool — ask the user first.",
          },
        },
        required: [
          "location_text",
          "suspected_dept",
          "requires_severe",
          "clarifying_detail",
        ],
      },
    },
  },
] as const;
