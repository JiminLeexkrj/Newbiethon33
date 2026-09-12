"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Coordinate, RawRoute } from "@/lib/routes/types";

type RouteMapProps = {
  origin: Coordinate;
  destination: Coordinate;
  route?: RawRoute | null;
  className?: string;
};

type RemovableOverlay = {
  setMap(map: kakao.maps.Map | null): void;
};

function makeBadge(label: string, color: string): HTMLDivElement {
  const badge = document.createElement("div");
  badge.textContent = label;
  badge.style.cssText = [
    "padding:6px 9px",
    "border-radius:9999px",
    `background:${color}`,
    "color:white",
    "font-size:12px",
    "font-weight:700",
    "white-space:nowrap",
    "box-shadow:0 3px 10px rgba(15,23,42,.25)",
    "border:2px solid white",
  ].join(";");
  return badge;
}

function FallbackRouteMap({
  origin,
  destination,
  route,
  className = "",
}: RouteMapProps) {
  const normalized = useMemo(() => {
    const path =
      route?.polyline && route.polyline.length > 1
        ? route.polyline
        : [origin, destination];
    const lngs = path.map((point) => point.lng);
    const lats = path.map((point) => point.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const lngRange = maxLng - minLng || 1;
    const latRange = maxLat - minLat || 1;

    return path.map((point) => ({
      x: 10 + ((point.lng - minLng) / lngRange) * 80,
      y: 90 - ((point.lat - minLat) / latRange) * 80,
    }));
  }, [destination, origin, route?.polyline]);

  const line = normalized.map((point) => `${point.x},${point.y}`).join(" ");
  const start = normalized[0];
  const end = normalized[normalized.length - 1];

  return (
    <div
      className={`relative min-h-72 overflow-hidden rounded-2xl bg-slate-100 ${className}`}
      role="img"
      aria-label="실제 지도 대신 표시하는 경로 도식"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        <polyline
          points={line}
          fill="none"
          stroke="#2563eb"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle cx={start.x} cy={start.y} r="3" fill="#2563eb" stroke="white" />
        <circle cx={end.x} cy={end.y} r="3" fill="#ef4444" stroke="white" />
      </svg>
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
        지도 SDK 미설정 · 경로 도식
      </span>
      <span className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
        현재 위치
      </span>
      <span className="absolute right-3 top-12 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
        목적지
      </span>
    </div>
  );
}

export function RouteMap({
  origin,
  destination,
  route,
  className = "",
}: RouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<RemovableOverlay[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);

  const markSdkReady = useCallback(() => {
    if (!window.kakao?.maps) {
      setSdkFailed(true);
      return;
    }
    window.kakao.maps.load(() => setSdkReady(true));
  }, []);

  useEffect(() => {
    if (window.kakao?.maps) {
      markSdkReady();
    }
  }, [markSdkReady]);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) return;

    const maps = window.kakao.maps;
    if (!mapRef.current) {
      mapRef.current = new maps.Map(containerRef.current, {
        center: new maps.LatLng(origin.lat, origin.lng),
        level: 5,
      });
    }

    const map = mapRef.current;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const originPosition = new maps.LatLng(origin.lat, origin.lng);
    const destinationPosition = new maps.LatLng(
      destination.lat,
      destination.lng,
    );
    const originOverlay = new maps.CustomOverlay({
      map,
      position: originPosition,
      content: makeBadge("현재 위치", "#2563eb"),
      xAnchor: 0.5,
      yAnchor: 1.3,
      zIndex: 3,
    });
    const destinationOverlay = new maps.CustomOverlay({
      map,
      position: destinationPosition,
      content: makeBadge("목적지", "#ef4444"),
      xAnchor: 0.5,
      yAnchor: 1.3,
      zIndex: 3,
    });

    const routePoints =
      route?.polyline && route.polyline.length > 1
        ? route.polyline
        : [origin, destination];
    const kakaoPath = routePoints.map(
      (point) => new maps.LatLng(point.lat, point.lng),
    );
    const polyline = new maps.Polyline({
      map,
      path: kakaoPath,
      strokeWeight: 6,
      strokeColor: route?.mode === "CAR" ? "#f97316" : "#2563eb",
      strokeOpacity: 0.88,
      strokeStyle: "solid",
    });

    overlaysRef.current = [originOverlay, destinationOverlay, polyline];

    const bounds = new maps.LatLngBounds();
    kakaoPath.forEach((point) => bounds.extend(point));
    map.relayout();
    map.setBounds(bounds, 56, 56, 56, 56);

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [destination, origin, route, sdkReady]);

  if (!apiKey || sdkFailed) {
    return (
      <FallbackRouteMap
        origin={origin}
        destination={destination}
        route={route}
        className={className}
      />
    );
  }

  return (
    <div className={`relative min-h-72 overflow-hidden rounded-2xl ${className}`}>
      <Script
        id="kakao-map-sdk"
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false`}
        strategy="afterInteractive"
        onLoad={markSdkReady}
        onError={() => setSdkFailed(true)}
      />
      <div ref={containerRef} className="absolute inset-0" />
      {!sdkReady && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-medium text-slate-500">
          지도를 불러오는 중…
        </div>
      )}
    </div>
  );
}
