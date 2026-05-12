// Multi-turn chat test harness.
// Sends an initial user message, follows up with canned answers if the assistant asks,
// records the finalize_query args, then calls /api/match.
// Usage: bun run scripts/test-chat.ts

const API = "http://localhost:8787";
const LOC = {
  text: "충청북도 청주시 청원구 대성로 298",
  lat: 36.65154,
  lng: 127.49558,
};

interface Scenario {
  name: string;
  initial: string;
  // Canned follow-up answers in order; used if the assistant asks instead of finalizing.
  followups: string[];
}

const SCENARIOS: Scenario[] = [
  {
    name: "머리 부딪힘+구토",
    initial: "애가 머리 부딪혔는데 토해요",
    followups: ["의식은 있어요", "한번 토했어요"],
  },
  {
    name: "임신 중 복통",
    initial: "아내가 임신 중인데 배가 너무 아파요",
    followups: ["임신 32주차예요", "출혈은 없어요"],
  },
  {
    name: "흉통+식은땀",
    initial: "가슴이 답답하고 식은땀 나요",
    followups: ["왼쪽 팔로 퍼져요", "10분쯤 됐어요"],
  },
  {
    name: "노인 갑작스러운 말 못함",
    initial: "할머니가 갑자기 말을 못해요",
    followups: ["의식은 있어요", "한쪽 팔이 안 움직여요"],
  },
  {
    name: "소아 약물 섭취",
    initial: "애가 약 먹었는데 뭐 먹었는지 몰라요",
    followups: ["의식은 있어요", "30분 전쯤이요"],
  },
  {
    name: "임신 중 어깨 출혈",
    initial: "아내가 임신 중인데 출혈이 있어요",
    followups: ["어깨에서요", "넘어졌어요"],
  },
];

type ChatResult =
  | { type: "tool"; name: string; args: any; turns: TurnLog[] }
  | { type: "text_only"; text: string; turns: TurnLog[] };

interface TurnLog {
  user: string;
  assistant: string;
  toolArgs?: any;
}

async function streamChat(messages: any[]): Promise<{ text: string; toolArgs?: any }> {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      location_text: LOC.text,
      lat: LOC.lat,
      lng: LOC.lng,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let toolArgs: any;
  let inToolEvent = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line === "") {
        inToolEvent = false;
        continue;
      }
      if (line.startsWith("event: tool")) {
        inToolEvent = true;
        continue;
      }
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trimStart();
        if (inToolEvent) {
          try {
            const obj = JSON.parse(payload);
            toolArgs = obj.args;
          } catch {}
        } else {
          text += payload;
        }
      }
    }
  }
  return { text: text.trim(), toolArgs };
}

async function runScenario(sc: Scenario): Promise<ChatResult> {
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: sc.initial },
  ];
  const turns: TurnLog[] = [];
  let followupIdx = 0;
  let lastUser = sc.initial;
  for (let i = 0; i < 5; i++) {
    const { text, toolArgs } = await streamChat(messages);
    if (toolArgs) {
      turns.push({ user: lastUser, assistant: text || "(직접 finalize)", toolArgs });
      return { type: "tool", name: "finalize_query", args: toolArgs, turns };
    }
    turns.push({ user: lastUser, assistant: text });
    messages.push({ role: "assistant", content: text });
    if (followupIdx >= sc.followups.length) {
      return { type: "text_only", text, turns };
    }
    const next = sc.followups[followupIdx++]!;
    messages.push({ role: "user", content: next });
    lastUser = next;
  }
  return { type: "text_only", text: "(max turns exceeded)", turns };
}

async function callMatch(args: any) {
  const res = await fetch(`${API}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location_text: args.location_text || LOC.text,
      lat: LOC.lat,
      lng: LOC.lng,
      suspected_dept: args.suspected_dept,
      severity_hints: args.severity_hints ?? [],
      requires_severe: args.requires_severe ?? false,
    }),
  });
  if (!res.ok) return { error: res.status };
  return await res.json();
}

function pad(s: string, n: number) {
  const w = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
  return s + " ".repeat(Math.max(0, n - w));
}

const all: { sc: Scenario; res: ChatResult; match?: any }[] = [];
for (const sc of SCENARIOS) {
  process.stdout.write(`▶ ${sc.name} ... `);
  try {
    const res = await runScenario(sc);
    let match: any;
    if (res.type === "tool") match = await callMatch(res.args);
    all.push({ sc, res, match });
    console.log("done");
  } catch (e) {
    console.log("ERROR", e);
  }
}

console.log("\n=== 대화 로그 ===\n");
for (const { sc, res } of all) {
  console.log(`■ ${sc.name}`);
  for (const t of res.turns) {
    console.log(`  사용자: ${t.user}`);
    console.log(`  어시스턴트: ${t.assistant}`);
  }
  if (res.type === "tool") {
    console.log(`  → finalize_query: dept=${res.args.suspected_dept}, requires_severe=${res.args.requires_severe}, hints=${JSON.stringify(res.args.severity_hints ?? [])}`);
  }
  console.log();
}

console.log("=== 요약 표 ===\n");
console.log(
  pad("시나리오", 28),
  pad("턴수", 6),
  pad("진료과", 12),
  pad("중증필수", 10),
  pad("primary", 28),
  pad("중증라벨", 30),
);
console.log("-".repeat(120));
for (const { sc, res, match } of all) {
  const turns = res.turns.length;
  if (res.type === "tool") {
    const args = res.args;
    const p = match?.primary;
    console.log(
      pad(sc.name, 28),
      pad(String(turns), 6),
      pad(args.suspected_dept ?? "-", 12),
      pad(String(args.requires_severe ?? "-"), 10),
      pad(p?.name ?? "(없음)", 28),
      pad(
        p
          ? `${p.dept_severe_label ?? "-"}/${p.dept_severe_available === true ? "가능" : p.dept_severe_available === false ? "불가" : "-"}`
          : "-",
        30,
      ),
    );
  } else {
    console.log(pad(sc.name, 28), pad(String(turns), 6), "tool 호출 안됨");
  }
}
