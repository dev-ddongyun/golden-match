import { buildKakaoRouteWebUrl } from "@goldenmatch/schema";

export interface OpenRouteArgs {
  name: string;
  destLat: number;
  destLng: number;
  originLat?: number;
  originLng?: number;
  /** Optional pre-built web fallback (defaults to buildKakaoRouteWebUrl). */
  fallbackUrl?: string;
}

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openRoute({
  name,
  destLat,
  destLng,
  originLat,
  originLng,
  fallbackUrl,
}: OpenRouteArgs) {
  const webUrl = fallbackUrl ?? buildKakaoRouteWebUrl(name, destLat, destLng);

  if (originLat != null && originLng != null && isMobileUA()) {
    const deep = `kakaomap://route?sp=${originLat},${originLng}&ep=${destLat},${destLng}&by=CAR`;
    window.location.href = deep;
    setTimeout(() => {
      window.location.href = webUrl;
    }, 1200);
    return;
  }

  window.open(webUrl, "_blank", "noopener,noreferrer");
}
