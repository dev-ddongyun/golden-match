export * from "./dept";
export * from "./chat";
export * from "./match";
export * from "./escalate";

export const DISCLAIMER =
  "본 서비스는 의료행위가 아니며 응급실 안내·길찾기 보조 도구입니다.";
export const ESCALATE_MESSAGE = "지금은 119를 부르고 기다려주세요";
export const AVOID_TREATMENT_REPLY =
  "지금은 119 안내를 따라주세요. 저는 갈 응급실을 찾고 있습니다.";

export function buildKakaoRouteWebUrl(
  name: string,
  lat: number,
  lng: number,
): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}
