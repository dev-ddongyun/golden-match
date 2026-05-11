import type {
  ChatMessage,
  MatchRequest,
  MatchResponse,
  EscalateRequest,
  EscalateResponse,
} from "../schema";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export interface ChatBody {
  messages: ChatMessage[];
  location_text?: string;
  lat?: number;
  lng?: number;
}

export async function postChat(body: ChatBody): Promise<Response> {
  return fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

export async function postMatch(body: MatchRequest): Promise<MatchResponse> {
  const res = await fetch(`${BASE}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg ?? "응급실 매칭에 실패했습니다.");
  }
  return (await res.json()) as MatchResponse;
}

export async function postEscalate(
  body: EscalateRequest,
): Promise<EscalateResponse> {
  const res = await fetch(`${BASE}/api/escalate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await safeMessage(res);
    throw new Error(msg ?? "119 안내 정보를 가져오지 못했습니다.");
  }
  return (await res.json()) as EscalateResponse;
}

async function safeMessage(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? null;
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}
