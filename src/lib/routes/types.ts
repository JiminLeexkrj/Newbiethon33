export type Coordinate = {
  lat: number;
  lng: number;
};

export type TravelMode = "WALK" | "BUS" | "SUBWAY" | "CAR" | "MIXED";

export type SegmentMode = Exclude<TravelMode, "MIXED">;

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type RouteSegment = {
  mode: SegmentMode;
  from: string;
  to: string;
  durationMinutes: number;
  distanceMeters?: number;
  routeName?: string;
};

export type RouteProvider = "ODSAY" | "KAKAO_MOBILITY" | "MOCK";

export type RawRoute = {
  id: string;
  mode: TravelMode;
  durationMinutes: number;
  distanceMeters: number;
  estimatedArrivalTime: string;
  fare?: number;
  segments: RouteSegment[];

  /** 지도 표시용 확장 필드. 3번 개발자는 무시해도 됩니다. */
  polyline?: Coordinate[];
  /** 데이터 출처를 추적하기 위한 확장 필드. */
  provider?: RouteProvider;
  /** 현재 교통정보가 반영된 데이터인지 나타냅니다. */
  isRealtime?: boolean;
  fetchedAt?: string;
};

export type RouteDataMode = "auto" | "live" | "demo";
export type RouteDataSource = "live" | "mock";

export type DemoScenario = "NORMAL" | "CONGESTED";

export type DemoMetadata = {
  scenario: DemoScenario;
  elapsedSeconds: number;
  congestionAtSeconds: number;
  message: string;
};

export type RoutesResponse = {
  routes: RawRoute[];
  generatedAt: string;
  source: RouteDataSource;
  providers: RouteProvider[];
  warnings?: string[];
  fallbackReason?: string;
  demo?: DemoMetadata;
};

export type PlacesResponse = {
  places: PlaceResult[];
  generatedAt: string;
  source: "live" | "mock";
  provider: "KAKAO_LOCAL" | "MOCK";
  fallbackReason?: string;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
};

