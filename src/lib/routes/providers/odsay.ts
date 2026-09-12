import { downsampleCoordinates } from "@/lib/routes/geometry";
import { addMinutesToArrivalTime } from "@/lib/routes/time";
import type {
  Coordinate,
  RawRoute,
  RouteSegment,
  SegmentMode,
  TravelMode,
} from "@/lib/routes/types";

type ODsayLane = {
  name?: string;
  busNo?: string;
};

type ODsayStation = {
  x?: string | number;
  y?: string | number;
};

type ODsaySubPath = {
  trafficType?: number;
  distance?: number;
  sectionTime?: number;
  startName?: string;
  endName?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  lane?: ODsayLane[];
  passStopList?: {
    stations?: ODsayStation[];
  };
};

type ODsayPath = {
  pathType?: number;
  info?: {
    totalTime?: number;
    payment?: number;
    totalDistance?: number;
  };
  subPath?: ODsaySubPath[];
};

type ODsayResponse = {
  result?: {
    path?: ODsayPath[];
  };
  error?: {
    code?: string | number;
    msg?: string;
  };
};

function trafficTypeToMode(trafficType?: number): SegmentMode {
  if (trafficType === 1) return "SUBWAY";
  if (trafficType === 2) return "BUS";
  return "WALK";
}

function pathTypeToMode(pathType?: number): TravelMode {
  if (pathType === 1) return "SUBWAY";
  if (pathType === 2) return "BUS";
  if (pathType === 3) return "MIXED";
  return "MIXED";
}

function asCoordinate(lngValue: unknown, latValue: unknown): Coordinate | null {
  const lng = Number(lngValue);
  const lat = Number(latValue);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lat, lng } : null;
}

function buildPolyline(
  path: ODsayPath,
  origin: Coordinate,
  destination: Coordinate,
): Coordinate[] {
  const points: Coordinate[] = [origin];

  for (const subPath of path.subPath ?? []) {
    const start = asCoordinate(subPath.startX, subPath.startY);
    if (start) points.push(start);

    for (const station of subPath.passStopList?.stations ?? []) {
      const point = asCoordinate(station.x, station.y);
      if (point) points.push(point);
    }

    const end = asCoordinate(subPath.endX, subPath.endY);
    if (end) points.push(end);
  }

  points.push(destination);
  return downsampleCoordinates(points);
}

function buildSegments(path: ODsayPath): RouteSegment[] {
  const subPaths = path.subPath ?? [];

  return subPaths.map((subPath, index) => {
    const mode = trafficTypeToMode(subPath.trafficType);
    const previous = subPaths[index - 1];
    const next = subPaths[index + 1];
    const from =
      subPath.startName ||
      previous?.endName ||
      (index === 0 ? "현재 위치" : "이전 구간");
    const to =
      subPath.endName ||
      next?.startName ||
      (index === subPaths.length - 1 ? "목적지" : "다음 구간");
    const firstLane = subPath.lane?.[0];
    const routeName =
      mode === "BUS"
        ? firstLane?.busNo
        : mode === "SUBWAY"
          ? firstLane?.name
          : undefined;

    return {
      mode,
      from,
      to,
      durationMinutes: Math.max(0, Math.round(subPath.sectionTime ?? 0)),
      ...(Number.isFinite(subPath.distance)
        ? { distanceMeters: Math.round(subPath.distance ?? 0) }
        : {}),
      ...(routeName ? { routeName } : {}),
    };
  });
}

export async function getODsayTransitRoutes(
  origin: Coordinate,
  destination: Coordinate,
): Promise<RawRoute[]> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (!apiKey) {
    throw new Error("ODSAY_API_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    SX: String(origin.lng),
    SY: String(origin.lat),
    EX: String(destination.lng),
    EY: String(destination.lat),
    OPT: "0",
    SearchType: "0",
    SearchPathType: "0",
    output: "json",
    apiKey,
  });

  const response = await fetch(
    `https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) {
    throw new Error(`ODsay API 오류 (${response.status})`);
  }

  const data = (await response.json()) as ODsayResponse;
  if (data.error) {
    throw new Error(
      `ODsay API 오류 (${String(data.error.code ?? "unknown")}): ${data.error.msg ?? "응답 오류"}`,
    );
  }

  const fetchedAt = new Date().toISOString();
  return (data.result?.path ?? [])
    .filter(
      (path) =>
        Number.isFinite(path.info?.totalTime) &&
        Number.isFinite(path.info?.totalDistance),
    )
    .slice(0, 3)
    .map((path, index): RawRoute => {
      const durationMinutes = Math.max(1, Math.round(path.info?.totalTime ?? 0));
      const distanceMeters = Math.max(
        0,
        Math.round(path.info?.totalDistance ?? 0),
      );
      const fare = path.info?.payment;
      const polyline = buildPolyline(path, origin, destination);

      return {
        id: `odsay-transit-${index + 1}`,
        mode: pathTypeToMode(path.pathType),
        durationMinutes,
        distanceMeters,
        estimatedArrivalTime: addMinutesToArrivalTime(durationMinutes),
        ...(Number.isFinite(fare) ? { fare } : {}),
        segments: buildSegments(path),
        ...(polyline.length > 1 ? { polyline } : {}),
        provider: "ODSAY",
        isRealtime: false,
        fetchedAt,
      };
    });
}

