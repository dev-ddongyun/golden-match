import type { HospitalCandidate } from "@goldenmatch/schema";
import { openRoute } from "../lib/kakaoLink";

interface Props {
  hospital: HospitalCandidate;
  primary?: boolean;
  originLat?: number;
  originLng?: number;
  /** Destination coords if available from the API; falls back to web link only. */
  destLat?: number;
  destLng?: number;
}

export default function ResultCard({
  hospital,
  primary,
  originLat,
  originLng,
  destLat,
  destLng,
}: Props) {
  const {
    name,
    address,
    phone,
    available_beds,
    accepts_severe,
    distance_km,
    eta_min,
    kakao_route_url,
  } = hospital;

  function handleRoute() {
    openRoute({
      name,
      destLat: destLat ?? 0,
      destLng: destLng ?? 0,
      originLat,
      originLng,
      fallbackUrl: kakao_route_url,
    });
  }

  return (
    <div
      className={[
        "rounded-2xl p-4 border bg-white shadow-sm",
        primary
          ? "border-red-500 ring-2 ring-red-200"
          : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={[
            "font-bold leading-tight",
            primary ? "text-2xl" : "text-xl",
          ].join(" ")}
        >
          {name}
        </h3>
        {primary && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full shrink-0">
            추천
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mt-1">{address}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          가용 병상 {available_beds}
        </span>
        {accepts_severe != null && (
          <span
            className={[
              "text-xs px-2 py-1 rounded-full border",
              accepts_severe
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200",
            ].join(" ")}
          >
            중증 수용 {accepts_severe ? "가능" : "불가"}
          </span>
        )}
        {distance_km != null && (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
            {distance_km.toFixed(1)} km
          </span>
        )}
        {eta_min != null && (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
            약 {Math.round(eta_min)}분
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={handleRoute}
          className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-base active:bg-red-700"
        >
          길찾기 출발
        </button>
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
          className="px-4 py-3 rounded-xl border border-gray-300 text-gray-800 font-semibold text-base text-center"
        >
          전화
        </a>
      </div>
    </div>
  );
}
