import type { Coordinate } from "./types";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  from: Coordinate,
  to: Coordinate,
): number {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return Math.round(
    EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

export function createCurvedPolyline(
  origin: Coordinate,
  destination: Coordinate,
  curve = 0,
  steps = 14,
): Coordinate[] {
  const latDelta = destination.lat - origin.lat;
  const lngDelta = destination.lng - origin.lng;
  const length = Math.hypot(latDelta, lngDelta) || 1;
  const perpendicularLat = -lngDelta / length;
  const perpendicularLng = latDelta / length;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const curveStrength = Math.sin(progress * Math.PI) * curve;

    return {
      lat: origin.lat + latDelta * progress + perpendicularLat * curveStrength,
      lng: origin.lng + lngDelta * progress + perpendicularLng * curveStrength,
    };
  });
}

export function downsampleCoordinates(
  coordinates: Coordinate[],
  maxPoints = 600,
): Coordinate[] {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  const sampled: Coordinate[] = [];
  const stride = (coordinates.length - 1) / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(coordinates[Math.round(index * stride)]);
  }

  return sampled;
}

