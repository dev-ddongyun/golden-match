import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ESCALATE_MESSAGE,
  type EscalateReasonLabel,
  type EscalateResponse,
} from "@goldenmatch/schema";
import Disclaimer from "../components/Disclaimer";
import { postEscalate } from "../lib/api";

interface EscalateState {
  reason_label?: EscalateReasonLabel;
  location_text?: string;
  lat?: number;
  lng?: number;
}

export default function Escalate() {
  const location = useLocation();
  const state = (location.state as EscalateState | null) ?? {};
  const [info, setInfo] = useState<EscalateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reason: EscalateReasonLabel = state.reason_label ?? "기타";
    postEscalate({
      reason_label: reason,
      location_text: state.location_text ?? "",
      lat: state.lat,
      lng: state.lng,
    })
      .then(setInfo)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "정보를 가져오지 못했습니다."),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-full flex flex-col bg-red-50">
      <div className="bg-red-600 text-white px-5 py-6 text-center">
        <p className="text-sm opacity-90">긴급 안내</p>
        <h1 className="text-2xl font-black mt-1">{ESCALATE_MESSAGE}</h1>
      </div>

      <main className="flex-1 px-5 py-6 pb-28 max-w-xl w-full mx-auto flex flex-col gap-6">
        <a
          href="tel:119"
          className="block text-center py-8 rounded-3xl bg-red-600 text-white text-5xl font-black shadow-xl active:bg-red-700"
        >
          119 전화
        </a>

        <p className="text-center text-sm text-gray-700">
          지금 환자를 직접 이송하지 말고, 119 지시에 따라주세요.
        </p>

        {error && (
          <p className="text-xs text-red-700 text-center">{error}</p>
        )}

        {info && (
          <div className="border-t border-red-200 pt-4 text-xs text-gray-500">
            <p className="mb-1">참고용 인근 응급의료기관</p>
            <p className="text-sm text-gray-700 font-medium">
              {info.reference_center.name}
            </p>
            <p>{info.reference_center.address}</p>
            <p>{info.reference_center.phone}</p>
          </div>
        )}
      </main>

      <Disclaimer />
    </div>
  );
}
