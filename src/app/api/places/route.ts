import { NextRequest, NextResponse } from "next/server";

import { parsePlaceQuery, QueryValidationError } from "@/lib/http/query";
import { searchKakaoPlaces } from "@/lib/places/kakao";
import { searchMockPlaces } from "@/lib/places/mock";
import type {
  ApiErrorResponse,
  PlacesResponse,
  RouteDataMode,
} from "@/lib/routes/types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function resolveMode(request: NextRequest): RouteDataMode {
  if (request.nextUrl.searchParams.get("demo") === "true") return "demo";
  const queryMode = request.nextUrl.searchParams.get("mode");
  if (queryMode === "live" || queryMode === "demo" || queryMode === "auto") {
    return queryMode;
  }
  const environmentMode = process.env.ROUTE_DATA_MODE;
  if (
    environmentMode === "live" ||
    environmentMode === "demo" ||
    environmentMode === "auto"
  ) {
    return environmentMode;
  }
  return "auto";
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<PlacesResponse | ApiErrorResponse>> {
  try {
    const { keyword, origin } = parsePlaceQuery(request.nextUrl.searchParams);
    const mode = resolveMode(request);

    if (mode === "demo") {
      return NextResponse.json(
        {
          places: searchMockPlaces(keyword),
          generatedAt: new Date().toISOString(),
          source: "mock",
          provider: "MOCK",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    try {
      const places = await searchKakaoPlaces(keyword, origin);
      return NextResponse.json(
        {
          places,
          generatedAt: new Date().toISOString(),
          source: "live",
          provider: "KAKAO_LOCAL",
        },
        { headers: NO_STORE_HEADERS },
      );
    } catch (providerError) {
      const message =
        providerError instanceof Error
          ? providerError.message
          : "Kakao Local API 호출에 실패했습니다.";

      if (mode === "live") {
        return NextResponse.json(
          {
            error: {
              code: "PLACE_PROVIDER_FAILED",
              message,
            },
          },
          { status: 502, headers: NO_STORE_HEADERS },
        );
      }

      return NextResponse.json(
        {
          places: searchMockPlaces(keyword),
          generatedAt: new Date().toISOString(),
          source: "mock",
          provider: "MOCK",
          fallbackReason: message,
        },
        { headers: NO_STORE_HEADERS },
      );
    }
  } catch (error) {
    if (error instanceof QueryValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: error.message,
            details: error.details,
          },
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "PLACE_SEARCH_FAILED",
          message: "장소 검색 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

