"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { RouteMap } from "@/components/map/RouteMap";
import { useCurrentPosition } from "@/hooks/use-current-position";
import { useRoutes } from "@/hooks/use-routes";
import { searchPlace } from "@/lib/routes/client";
import type {
  PlaceResult,
  RouteDataMode,
} from "@/lib/routes/types";

const DEMO_ORIGIN = {
  lat: 37.5666103,
  lng: 126.9783882,
};

const DEFAULT_DESTINATION: PlaceResult = {
  name: "고려대학교 서울캠퍼스",
  address: "서울특별시 성북구 안암로 145",
  lat: 37.5893876,
  lng: 127.0324773,
};

function formatDistance(meters: number): string {
  return meters >= 1_000
    ? `${(meters / 1_000).toFixed(1)} km`
    : `${meters.toLocaleString("ko-KR")} m`;
}

export function RouteDataPlayground() {
  const {
    position,
    error: positionError,
    isLoading: isPositionLoading,
    requestPosition,
    setPosition,
  } = useCurrentPosition();
  const [keyword, setKeyword] = useState("고려대학교");
  const [destination, setDestination] =
    useState<PlaceResult>(DEFAULT_DESTINATION);
  const [mode, setMode] = useState<RouteDataMode>("auto");
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const { data, routes, error, isLoading, refresh } = useRoutes({
    origin: position,
    destination,
    mode,
    enabled: Boolean(position),
    refreshEveryMs: 30_000,
  });

  useEffect(() => {
    if (
      routes.length > 0 &&
      !routes.some((route) => route.id === selectedRouteId)
    ) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0],
    [routes, selectedRouteId],
  );

  async function handlePlaceSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlaceError(null);
    setIsSearching(true);

    try {
      const places = await searchPlace(keyword, {
        origin: position ?? undefined,
        mode,
      });
      if (places.length === 0) {
        setPlaceError("검색 결과가 없습니다. 실제 API 키 또는 Demo 검색어를 확인하세요.");
        return;
      }
      setDestination(places[0]);
    } catch (searchError) {
      setPlaceError(
        searchError instanceof Error
          ? searchError.message
          : "목적지 검색에 실패했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold text-blue-600">개발자 2 · Route Data Layer</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          현재 위치 → 목적지 → 후보 경로 → 재탐색
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          팀 통합 전 API와 지도 컴포넌트를 검증하기 위한 최소 예제 화면입니다.
        </p>
      </header>

      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">출발지</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : isPositionLoading
                ? "현재 위치 확인 중…"
                : "현재 위치 없음"}
          </p>
          {positionError && (
            <p className="mt-1 text-xs text-amber-700">{positionError}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void requestPosition().catch(() => undefined)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            위치 다시 받기
          </button>
          <button
            type="button"
            onClick={() => setPosition(DEMO_ORIGIN)}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            서울시청 좌표 사용
          </button>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handlePlaceSearch} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              목적지 검색
            </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="서울역, 고려대학교"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              데이터 모드
            </span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as RouteDataMode)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="auto">Auto + fallback</option>
              <option value="demo">Demo 고정</option>
              <option value="live">Live만</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={isSearching}
            className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? "검색 중…" : "목적지 검색"}
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-700">
          선택: <strong>{destination.name}</strong> · {destination.address}
        </p>
        {placeError && <p className="mt-2 text-sm text-red-600">{placeError}</p>}
      </section>

      {position ? (
        <RouteMap
          origin={position}
          destination={destination}
          route={selectedRoute}
          className="mb-4 h-[360px] border border-slate-200 shadow-sm"
        />
      ) : (
        <div className="mb-4 grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
          위치 권한을 허용하거나 ‘서울시청 좌표 사용’을 누르면 지도가 표시됩니다.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-950">후보 경로 데이터</h2>
            <p className="text-xs text-slate-500">
              {data
                ? `${data.source.toUpperCase()} · ${data.providers.join(", ")} · ${new Date(data.generatedAt).toLocaleTimeString("ko-KR")}`
                : "아직 조회되지 않음"}
            </p>
          </div>
          <button
            type="button"
            disabled={!position || isLoading}
            onClick={() => void refresh()}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoading ? "재탐색 중…" : "현재 위치 기준 재탐색"}
          </button>
        </div>

        {data?.demo && (
          <div
            className={`mb-3 rounded-xl px-3 py-2 text-sm ${
              data.demo.scenario === "CONGESTED"
                ? "bg-red-50 text-red-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {data.demo.message}
          </div>
        )}
        {data?.fallbackReason && (
          <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
            실제 API fallback 사유: {data.fallbackReason}
          </p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {routes.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setSelectedRouteId(route.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedRoute?.id === route.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {route.mode} · {route.provider}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {route.durationMinutes}분
                  </p>
                </div>
                <p className="text-right text-xs leading-5 text-slate-600">
                  {formatDistance(route.distanceMeters)}
                  <br />도착 {route.estimatedArrivalTime}
                </p>
              </div>
              <p className="mt-2 truncate text-xs text-slate-600">
                {route.segments
                  .map((segment) => segment.routeName ?? segment.mode)
                  .join(" → ")}
              </p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

