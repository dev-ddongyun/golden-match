import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type {
  ChatMessage,
  FinalizeQueryArgs,
  MatchResponse,
} from "../schema";
import type { LocationValue } from "../components/LocationInput";
import ChatStream from "../components/ChatStream";
import { postChat, postMatch } from "../lib/api";
import { readSSE } from "../lib/sse";
import { getCurrentPosition } from "../lib/geo";

export default function Chat() {
  const navigate = useNavigate();
  const routerLoc = useLocation();
  const initial = (routerLoc.state as { location?: LocationValue } | null)?.location;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [location, setLocation] = useState<LocationValue>(initial ?? { text: "" });
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(text: string) {
    if (busy) return;
    setError(null);

    let loc = location;
    const isFirst = messages.filter((m) => m.role !== "system").length === 0;
    if (isFirst && !loc.text.trim() && loc.lat == null) {
      try {
        const pos = await getCurrentPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let display = "";
        try {
          const res = await fetch(`/api/geo/reverse?lng=${lng}&lat=${lat}`);
          if (res.ok) {
            const data = (await res.json()) as { display?: string };
            display = data.display ?? "";
          }
        } catch {
          // ignore
        }
        loc = { text: display || "현재 위치", lat, lng };
        setLocation(loc);
      } catch {
        // proceed without location
      }
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);

    const assistantIdx = nextMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await postChat({
        messages: nextMessages,
        location_text: loc.text || undefined,
        lat: loc.lat,
        lng: loc.lng,
      });
      if (!res.ok || !res.body) {
        throw new Error("대화 응답을 받지 못했습니다.");
      }

      await readSSE(res, {
        onText: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const cur = copy[assistantIdx];
            if (cur && cur.role === "assistant") {
              copy[assistantIdx] = { ...cur, content: cur.content + chunk };
            }
            return copy;
          });
        },
        onTool: async (tool) => {
          if (tool.name === "finalize_query") {
            const args = tool.args as unknown as FinalizeQueryArgs;
            await runMatch(args);
          }
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function runMatch(args: FinalizeQueryArgs) {
    setMatching(true);
    try {
      const result = await postMatch({
        location_text: args.location_text || location.text || "",
        lat: location.lat,
        lng: location.lng,
        suspected_dept: args.suspected_dept,
        severity_hints: args.severity_hints ?? [],
      });
      setMatch(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "매칭에 실패했습니다.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="shrink-0 flex items-center gap-2 h-14 px-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200"
        >
          <i className="bi bi-chevron-left text-xl" aria-hidden="true" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <i className="bi bi-geo-alt-fill text-red-600 text-lg shrink-0" aria-hidden="true" />
          <span className="text-base font-semibold text-gray-900 truncate">
            {location.text.trim() || "위치 미설정"}
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col">
        <ChatStream
          messages={messages}
          busy={busy}
          onSend={handleSend}
          error={error}
          match={match}
          matching={matching}
          originLat={location.lat}
          originLng={location.lng}
        />
      </main>
    </div>
  );
}
