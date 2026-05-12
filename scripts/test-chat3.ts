const API = "http://localhost:8787";
const LOC = { text: "충청북도 청주시 청원구 대성로 298", lat: 36.65154, lng: 127.49558 };

const SCENARIOS = [
  { name: "추락 후 다리 못 움직임", initial: "아빠가 사다리에서 떨어졌어요", followups: ["다리를 못 움직여요", "의식은 있어요"] },
  { name: "기름 화상", initial: "팔에 끓는 기름이 튀었어요", followups: ["손목부터 팔꿈치까지요", "물집이 잡혔어요"] },
  { name: "어지럽고 두근", initial: "갑자기 어지럽고 가슴이 두근거려요", followups: ["10분 정도 됐어요", "땀은 안 나요"] },
];

async function streamChat(messages: any[]) {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, location_text: LOC.text, lat: LOC.lat, lng: LOC.lng }),
  });
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", toolArgs: any, inToolEvent = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line === "") { inToolEvent = false; continue; }
      if (line.startsWith("event: tool")) { inToolEvent = true; continue; }
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trimStart();
        if (inToolEvent) { try { toolArgs = JSON.parse(payload).args; } catch {} }
        else text += payload;
      }
    }
  }
  return { text: text.trim(), toolArgs };
}

async function callMatch(args: any) {
  const res = await fetch(`${API}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location_text: args.location_text || LOC.text, lat: LOC.lat, lng: LOC.lng,
      suspected_dept: args.suspected_dept, severity_hints: args.severity_hints ?? [],
      requires_severe: args.requires_severe ?? false,
    }),
  });
  if (!res.ok) return null;
  return await res.json();
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

for (const sc of SCENARIOS) {
  console.log(`\n■ ${sc.name}`);
  const messages: any[] = [{ role: "user", content: sc.initial }];
  let lastUser = sc.initial, idx = 0, args: any;
  for (let i = 0; i < 5; i++) {
    const { text, toolArgs } = await streamChat(messages);
    console.log(`  사용자: ${lastUser}`);
    console.log(`  어시스턴트: ${toolArgs ? "(직접 finalize)" : text}`);
    if (toolArgs) { args = toolArgs; break; }
    messages.push({ role: "assistant", content: text });
    if (idx >= sc.followups.length) break;
    const next = sc.followups[idx++]!;
    messages.push({ role: "user", content: next });
    lastUser = next;
    await sleep(2500);
  }
  if (args) {
    console.log(`  → dept=${args.suspected_dept}, requires_severe=${args.requires_severe}, clarifying=${JSON.stringify(args.clarifying_detail ?? "")}`);
    const m = await callMatch(args);
    if (m?.primary) {
      const p = m.primary;
      console.log(`  primary: ${p.name} / 병상${p.available_beds} / ${p.eta_min}분 / ${p.dept_severe_label}=${p.dept_severe_available === true ? "가능" : "불가"}`);
      for (const a of m.alternatives ?? []) {
        console.log(`  alt: ${a.name} / 병상${a.available_beds} / ${a.eta_min}분 / ${a.dept_severe_label}=${a.dept_severe_available === true ? "가능" : "불가"}`);
      }
    }
  }
  await sleep(6000);
}
