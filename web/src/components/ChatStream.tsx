import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, MatchResponse } from "../schema";
import ResultCard from "./ResultCard";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  error?: string | null;
  match?: MatchResponse | null;
  matching?: boolean;
  originLat?: number;
  originLng?: number;
}

const SUGGESTIONS = [
  "깊은 상처가 났어요",
  "아내가 임신 중인데 출혈이 있어요",
  "약·이물질을 잘못 먹었어요",
  "아이가 열이 많이 나요",
];

export default function ChatStream({ messages, busy, onSend, error, match, matching, originLat, originLng }: Props) {
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = getSpeechCtor() !== null;

  function startListening() {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    try {
      const r = new Ctor();
      r.lang = "ko-KR";
      r.interimResults = false;
      r.continuous = false;
      r.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((res) => res[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (transcript) setDraft((d) => (d ? d + " " + transcript : transcript));
      };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      recogRef.current = r;
      setListening(true);
      r.start();
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    try {
      recogRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const visible = messages.filter((m) => m.role !== "system");
  const isEmpty = visible.length === 0;
  const locked = !!match || !!matching;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, match, matching]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setDraft("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6 pb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50">
              <i className="bi bi-chat-heart-fill text-red-600 text-2xl" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">어디가 불편하신가요?</h2>
              <p className="mt-1 text-sm text-gray-500">증상을 짧게 말씀해 주세요.</p>
            </div>
            <div className="w-full flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="w-full text-left text-sm text-gray-800 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} busy={busy && i === visible.length - 1} />
            ))}
            {matching && !match && <MatchLoading />}
            {match && (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold text-gray-500 px-1">지금 갈 수 있는 응급실</p>
                <ResultCard hospital={match.primary} primary originLat={originLat} originLng={originLng} />
                {match.alternatives.slice(0, 2).map((h, i) => (
                  <ResultCard key={i} hospital={h} originLat={originLat} originLng={originLng} />
                ))}
              </div>
            )}
            {error && <p className="text-xs text-red-600 px-1">{error}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-3 py-3">
        {locked ? (
          <p className="text-center text-xs text-gray-500 py-2">
            응급실 안내가 완료되었습니다. 위 카드의 길찾기·전화를 이용해 주세요.
          </p>
        ) : (
          <form onSubmit={submit} className="flex items-end gap-2">
            <div className="flex-1 flex items-center min-h-11 rounded-2xl border border-gray-300 bg-gray-50 focus-within:border-gray-400 focus-within:bg-white transition px-3 py-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKey}
                placeholder="증상을 입력하세요"
                disabled={busy}
                className="flex-1 resize-none bg-transparent text-base leading-6 max-h-[120px] focus:outline-none placeholder:text-gray-400 disabled:opacity-60 overflow-y-auto"
              />
            </div>
            {draft.trim() ? (
              <button
                type="submit"
                disabled={busy}
                aria-label="전송"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-red-600 text-white disabled:bg-gray-300 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition"
              >
                <i className={`bi ${busy ? "bi-arrow-repeat animate-spin" : "bi-arrow-up"} text-lg`} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={busy || !speechSupported}
                aria-label={listening ? "음성 입력 중지" : "음성으로 입력"}
                title={speechSupported ? undefined : "이 브라우저는 음성 인식을 지원하지 않습니다"}
                className={[
                  "shrink-0 relative inline-flex items-center justify-center w-11 h-11 rounded-full transition focus-visible:outline-none focus-visible:ring-2",
                  listening
                    ? "bg-red-600 text-white focus-visible:ring-red-300"
                    : "bg-gray-900 text-white disabled:bg-gray-300 active:bg-gray-700 focus-visible:ring-gray-400",
                ].join(" ")}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-full bg-red-500/50 animate-ping" aria-hidden="true" />
                )}
                <i className={`bi ${listening ? "bi-mic-fill" : "bi-mic"} text-lg relative`} aria-hidden="true" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  busy,
}: {
  role: ChatMessage["role"];
  content: string;
  busy: boolean;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-red-600 text-white px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }
  const cleaned = content.replace(/^\s*(어시스턴트|AI|봇|assistant)\s*[:：]\s*/i, "");
  return (
    <div className="max-w-[80%] text-[15px] leading-relaxed text-gray-900">
      {cleaned ? (
        <Markdown text={cleaned} />
      ) : busy ? (
        <span className="inline-flex gap-1"><Dot /><Dot delay={150} /><Dot delay={300} /></span>
      ) : null}
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-red-600 underline underline-offset-2">
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="px-1 py-0.5 rounded bg-gray-100 text-[13px] font-mono">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 p-3 rounded-lg bg-gray-100 text-[13px] font-mono overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-600 my-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-[13px] border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 text-left">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function MatchLoading() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold text-gray-500 px-1">응급실을 찾는 중…</p>
      <div className="rounded-2xl p-4 border border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <i className="bi bi-hospital-fill text-red-600 text-xl" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-5/6 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />
          <span>가장 가까운 수용 가능 응급실을 계산 중…</span>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
