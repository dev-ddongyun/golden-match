import { useEffect, useState } from "react";
import { getCurrentPosition } from "../lib/geo";

export interface LocationValue {
  text: string;
  lat?: number;
  lng?: number;
}

interface Props {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}

export default function LocationInput({ value, onChange }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "denied">(
    "idle",
  );
  const [autoTried, setAutoTried] = useState(false);

  async function requestGeo() {
    setStatus("loading");
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
        // ignore — fall back to coords-only
      }
      onChange({
        text: display || value.text || "현재 위치",
        lat,
        lng,
      });
      setStatus("ok");
    } catch {
      setStatus("denied");
    }
  }

  useEffect(() => {
    if (autoTried) return;
    setAutoTried(true);
    void requestGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder="OO동만 적어주셔도 됩니다"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          type="button"
          onClick={requestGeo}
          disabled={status === "loading"}
          className="shrink-0 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:bg-gray-400"
        >
          {status === "loading" ? "확인중…" : "내 위치 사용"}
        </button>
      </div>
      {status === "ok" && value.lat != null && (
        <p className="text-xs text-green-700">
          현재 위치: {value.text || `${value.lat.toFixed(5)}, ${value.lng?.toFixed(5)}`}
        </p>
      )}
      {status === "denied" && (
        <p className="text-xs text-gray-500">
          위치 권한이 없으면 동 이름만 입력해 주세요.
        </p>
      )}
    </div>
  );
}
