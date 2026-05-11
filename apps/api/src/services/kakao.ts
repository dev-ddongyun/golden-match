import { buildKakaoRouteWebUrl } from "@goldenmatch/schema";

function getKey(): string | null {
  return (
    process.env.KAKAO_REST_API_KEY ?? process.env.KAKAO_MOBILITY_API_KEY ?? null
  );
}

async function kakaoFetch(url: string): Promise<any | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchAddress(query: string): Promise<{
  lng: number;
  lat: number;
  address_name: string;
} | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;
  const data = await kakaoFetch(url);
  const doc = data?.documents?.[0];
  if (!doc) return null;
  const x = parseFloat(doc.x);
  const y = parseFloat(doc.y);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { lng: x, lat: y, address_name: doc.address_name ?? query };
}

export async function searchKeyword(query: string): Promise<{
  lng: number;
  lat: number;
  place_name: string;
} | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;
  const data = await kakaoFetch(url);
  const doc = data?.documents?.[0];
  if (!doc) return null;
  const x = parseFloat(doc.x);
  const y = parseFloat(doc.y);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { lng: x, lat: y, place_name: doc.place_name ?? query };
}

export async function coord2regioncode(
  lng: number,
  lat: number,
): Promise<{ stage1: string; stage2: string } | null> {
  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`;
  const data = await kakaoFetch(url);
  const docs: any[] = data?.documents ?? [];
  // Prefer H (행정동) but B works too — region_1depth_name / region_2depth_name shared.
  const doc = docs.find((d) => d.region_type === "H") ?? docs[0];
  if (!doc) return null;
  return {
    stage1: doc.region_1depth_name ?? "",
    stage2: doc.region_2depth_name ?? "",
  };
}

export async function coord2address(
  lng: number,
  lat: number,
): Promise<{ address_name: string; road_address_name: string } | null> {
  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  const data = await kakaoFetch(url);
  const doc = data?.documents?.[0];
  if (!doc) return null;
  return {
    address_name: doc.address?.address_name ?? "",
    road_address_name: doc.road_address?.address_name ?? "",
  };
}

export async function directions(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
): Promise<{ duration_sec: number; distance_m: number } | null> {
  const key = getKey();
  if (!key) return null;
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${originLng},${originLat}&destination=${destLng},${destLat}&priority=TIME`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const summary = data?.routes?.[0]?.summary;
    if (!summary) return null;
    const duration = Number(summary.duration);
    const distance = Number(summary.distance);
    if (Number.isNaN(duration) || Number.isNaN(distance)) return null;
    return { duration_sec: duration, distance_m: distance };
  } catch {
    return null;
  }
}

export function buildRouteUrl(name: string, lat: number, lng: number): string {
  return buildKakaoRouteWebUrl(name, lat, lng);
}
