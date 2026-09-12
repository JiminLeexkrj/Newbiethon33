import type { Coordinate } from "@/lib/routes/types";

export type GeolocationRequestOptions = Pick<
  PositionOptions,
  "enableHighAccuracy" | "maximumAge" | "timeout"
>;

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5_000,
};

function requireGeolocation(): Geolocation {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("이 브라우저에서는 위치정보를 사용할 수 없습니다.");
  }
  return navigator.geolocation;
}

function toCoordinate(position: GeolocationPosition): Coordinate {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

export function getCurrentPosition(
  options: GeolocationRequestOptions = {},
): Promise<Coordinate> {
  return new Promise((resolve, reject) => {
    let geolocation: Geolocation;
    try {
      geolocation = requireGeolocation();
    } catch (error) {
      reject(error);
      return;
    }

    geolocation.getCurrentPosition(
      (position) => resolve(toCoordinate(position)),
      (error) => reject(error),
      { ...DEFAULT_OPTIONS, ...options },
    );
  });
}

export function watchCurrentPosition(
  onPosition: (coordinate: Coordinate) => void,
  onError?: (error: GeolocationPositionError | Error) => void,
  options: GeolocationRequestOptions = {},
): () => void {
  let geolocation: Geolocation;
  try {
    geolocation = requireGeolocation();
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error("위치정보 오류"));
    return () => undefined;
  }

  const watchId = geolocation.watchPosition(
    (position) => onPosition(toCoordinate(position)),
    (error) => onError?.(error),
    { ...DEFAULT_OPTIONS, ...options },
  );

  return () => geolocation.clearWatch(watchId);
}

