import { useRef, useState } from "react";
import type { ChatMessage } from "@goldenmatch/schema";

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
}

export default function ChatStream({ messages, busy, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    onSend(text);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {busy && (
          <div className="text-xs text-gray-400 px-2">답변 작성 중…</div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="증상을 짧게 적어주세요"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="px-4 py-3 rounded-lg bg-red-600 text-white font-semibold disabled:bg-gray-400"
        >
          전송
        </button>
      </form>
    </div>
  );
}

function Bubble({
  role,
  content,
}: {
  role: ChatMessage["role"];
  content: string;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  return (
    <div
      className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}
    >
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-red-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm",
        ].join(" ")}
      >
        {content || (isUser ? "" : "…")}
      </div>
    </div>
  );
}
