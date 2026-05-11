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
          placeholder="우암동"
          className="flex-1 h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          type="button"
          onClick={requestGeo}
          disabled={status === "loading"}
          aria-label="내 위치 사용"
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 text-gray-900 disabled:text-gray-400"
        >
          <i
            className={`bi ${status === "loading" ? "bi-arrow-repeat animate-spin" : "bi-crosshair"} text-2xl`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
