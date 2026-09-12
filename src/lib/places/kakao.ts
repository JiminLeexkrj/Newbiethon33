import type { Coordinate, PlaceResult } from "@/lib/routes/types";

type KakaoPlaceDocument = {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoPlaceResponse = {
  documents?: KakaoPlaceDocument[];
};

export async function searchKakaoPlaces(
  keyword: string,
  origin?: Coordinate,
): Promise<PlaceResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    query: keyword,
    size: "5",
  });

  if (origin) {
    params.set("x", String(origin.lng));
    params.set("y", String(origin.lat));
    params.set("sort", "distance");
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Kakao Local API 오류 (${response.status})`);
  }

  const data = (await response.json()) as KakaoPlaceResponse;
  return (data.documents ?? [])
    .map((document): PlaceResult | null => {
      const lat = Number(document.y);
      const lng = Number(document.x);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return {
        name: document.place_name,
        address:
          document.road_address_name || document.address_name || document.place_name,
        lat,
        lng,
      };
    })
    .filter((place): place is PlaceResult => place !== null);
}

