import { buildMockRoutes } from "./mock";
import { getKakaoCarRoutes } from "./providers/kakao-mobility";
import { getODsayTransitRoutes } from "./providers/odsay";
import type {
  Coordinate,
  RawRoute,
  RouteDataMode,
  RouteProvider,
  RoutesResponse,
} from "./types";

type GetRouteCandidatesInput = {
  origin: Coordinate;
  destination: Coordinate;
  mode?: RouteDataMode;
  demoElapsedSeconds?: number;
};

function configuredMode(): RouteDataMode {
  const value = process.env.ROUTE_DATA_MODE;
  return value === "live" || value === "demo" || value === "auto"
    ? value
    : "auto";
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "알 수 없는 provider 오류";
}

function selectCandidateRoutes(
  transitRoutes: RawRoute[],
  carRoutes: RawRoute[],
): RawRoute[] {
  if (transitRoutes.length >= 3) {
    return [...transitRoutes.slice(0, 3), ...carRoutes.slice(0, 1)];
  }

  return [...transitRoutes, ...carRoutes].slice(0, 4);
}

export async function getRouteCandidates({
  origin,
  destination,
  mode,
  demoElapsedSeconds = 0,
}: GetRouteCandidatesInput): Promise<RoutesResponse> {
  const selectedMode = mode ?? configuredMode();

  if (selectedMode === "demo") {
    return buildMockRoutes(origin, destination, demoElapsedSeconds);
  }

  const warnings: string[] = [];
  const transitPromise = process.env.ODSAY_API_KEY
    ? getODsayTransitRoutes(origin, destination)
    : Promise.reject(new Error("ODSAY_API_KEY가 설정되지 않았습니다."));
  const carPromise = process.env.KAKAO_REST_API_KEY
    ? getKakaoCarRoutes(origin, destination)
    : Promise.reject(new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다."));

  const [transitResult, carResult] = await Promise.allSettled([
    transitPromise,
    carPromise,
  ]);

  const transitRoutes =
    transitResult.status === "fulfilled" ? transitResult.value : [];
  const carRoutes = carResult.status === "fulfilled" ? carResult.value : [];

  if (transitResult.status === "rejected") {
    warnings.push(errorMessage(transitResult.reason));
  }
  if (carResult.status === "rejected") {
    warnings.push(errorMessage(carResult.reason));
  }

  const routes = selectCandidateRoutes(transitRoutes, carRoutes);
  if (routes.length === 0) {
    const fallbackReason = warnings.join(" | ") || "실제 경로 결과가 없습니다.";
    if (selectedMode === "live") {
      throw new Error(fallbackReason);
    }

    return buildMockRoutes(
      origin,
      destination,
      demoElapsedSeconds,
      fallbackReason,
    );
  }

  const providers = Array.from(
    new Set(
      routes
        .map((route) => route.provider)
        .filter((provider): provider is RouteProvider => Boolean(provider)),
    ),
  );

  return {
    routes,
    generatedAt: new Date().toISOString(),
    source: "live",
    providers,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
