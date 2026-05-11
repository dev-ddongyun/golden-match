import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LocationInput, { type LocationValue } from "../components/LocationInput";

export default function LocationPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationValue>({ text: "" });

  const canProceed = location.text.trim().length > 0 || location.lat != null;

  function next() {
    if (!canProceed) return;
    navigate("/chat", { state: { location } });
  }

  return (
    <div className="h-full flex flex-col bg-white px-6 py-8 pt-safe pb-safe">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            어디에 계신가요?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            현재 위치를 기반으로 수용 가능한 최적의 응급실을 찾아드립니다.
          </p>
        </div>
        <div className="mt-8 w-full">
          <LocationInput value={location} onChange={setLocation} />
        </div>
      </div>

      <button
        type="button"
        onClick={next}
        disabled={!canProceed}
        className="w-full py-4 rounded-xl bg-red-600 text-white text-lg font-bold active:bg-red-700 active:translate-y-px disabled:bg-gray-300 disabled:active:translate-y-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      >
        다음
      </button>
    </div>
  );
}
