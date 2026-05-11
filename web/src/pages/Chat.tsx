import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ChatMessage,
  FinalizeQueryArgs,
  EscalateArgs,
  MatchResponse,
} from "../schema";
import Disclaimer from "../components/Disclaimer";
import LocationInput, { type LocationValue } from "../components/LocationInput";
import ChatStream from "../components/ChatStream";
import ResultCard from "../components/ResultCard";
import { postChat, postMatch } from "../lib/api";
import { readSSE } from "../lib/sse";

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [location, setLocation] = useState<LocationValue>({ text: "" });
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(text: string) {
    if (busy) return;
    setError(null);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);

    // optimistic assistant placeholder
    const assistantIdx = nextMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await postChat({
        messages: nextMessages,
        location_text: location.text || undefined,
        lat: location.lat,
        lng: location.lng,
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
              copy[assistantIdx] = {
                ...cur,
                content: cur.content + chunk,
              };
            }
            return copy;
          });
        },
        onTool: async (tool) => {
          if (tool.name === "finalize_query") {
            const args = tool.args as unknown as FinalizeQueryArgs;
            await runMatch(args);
          } else if (tool.name === "escalate_to_119") {
            const args = tool.args as unknown as EscalateArgs;
            navigate("/escalate", {
              state: {
                reason_label: args.reason_label,
                location_text: args.location_text || location.text || "",
                lat: location.lat,
                lng: location.lng,
              },
            });
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
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <header className="px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-red-600">골든매치</h1>
      </header>

      <main className="flex-1 px-4 py-4 pb-28 flex flex-col gap-4 max-w-xl w-full mx-auto">
        <section className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">위치</p>
          <LocationInput value={location} onChange={setLocation} />
        </section>

        <section className="bg-white rounded-xl p-3 border border-gray-200">
          <ChatStream
            messages={messages}
            busy={busy}
            onSend={handleSend}
          />
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </section>

        {match && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-700 px-1">
              지금 갈 수 있는 응급실
            </h2>
            <ResultCard
              hospital={match.primary}
              primary
              originLat={location.lat}
              originLng={location.lng}
            />
            {match.alternatives.slice(0, 2).map((h, i) => (
              <ResultCard
                key={i}
                hospital={h}
                originLat={location.lat}
                originLng={location.lng}
              />
            ))}
          </section>
        )}
      </main>

      <Disclaimer />
    </div>
  );
}
