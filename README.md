# 제시간 — 지각 방지 실시간 경로 추천 UI

목적지와 도착 마감시간을 입력하면 현재 이동 상태, 정시 도착 가능성, 지금 해야 할 행동, 대체 경로를 보여주는 해커톤용 Next.js 프론트엔드입니다.

현재 버전은 지도·경로·정시도착 API 없이 mock data만으로 전체 시연 흐름이 동작합니다. 화면 컴포넌트와 데이터 계층을 분리했기 때문에 `TripService` 구현체만 실제 API로 교체할 수 있습니다.

## 구현된 시연 흐름

1. 메인 화면에서 목적지와 도착 마감시간 입력
2. 현재 위치 mock 불러오기
3. 실시간 이동 현황 및 정시 도착 가능성 확인
4. 가장 중요한 현재 추천 행동 확인
5. `교통 변화 시연` 버튼으로 가상 정체 이벤트 발생
6. 경고 UI, 위험도, 추천 행동, 경로 비교 결과 동시 갱신
7. 세 가지 경로 비교 및 경로 선택
8. 최대 추가비용, 걷기 거리, 뛰기/택시 허용 설정

## 폴더 구조

```text
.
├── package.json
├── package-lock.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── src
    ├── app
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components
    │   ├── alert-banner.tsx
    │   ├── app-header.tsx
    │   ├── app-shell.tsx
    │   ├── destination-form.tsx
    │   ├── landing-page.tsx
    │   ├── recommended-action-card.tsx
    │   ├── risk-gauge.tsx
    │   ├── route-comparison.tsx
    │   ├── route-option-card.tsx
    │   ├── trip-dashboard.tsx
    │   ├── trip-status-card.tsx
    │   └── user-preference-panel.tsx
    ├── data
    │   └── mock-trip.ts
    ├── hooks
    │   └── use-trip-demo.ts
    ├── lib
    │   ├── risk.ts
    │   └── time.ts
    ├── services
    │   └── trip-service.ts
    └── types
        └── trip.ts
```

## 실행 방법

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

검증 명령:

```bash
npm run typecheck
npm run build
```

## 기존 Next.js 프로젝트에 합치는 방법

이 폴더 자체가 새 App Router 프로젝트이므로 그대로 실행할 수 있습니다. 기존 프로젝트에 추가할 때는 다음 순서를 권장합니다.

1. `src/components`, `src/data`, `src/hooks`, `src/lib`, `src/services`, `src/types`를 기존 프로젝트의 `src` 아래에 복사합니다.
2. 기존 `src/app/page.tsx` 대신 이 프로젝트의 페이지를 사용하거나 원하는 라우트(예: `src/app/on-time/page.tsx`)에 `AppShell`을 렌더링합니다.
3. `src/app/globals.css`의 커스텀 스타일을 기존 전역 CSS에 병합합니다.
4. `tailwind.config.ts`의 `content` 경로와 색상·애니메이션 확장 항목을 병합합니다.
5. 아이콘 패키지를 설치합니다.

```bash
npm install lucide-react
```

기존 설정 파일과 전역 CSS는 무조건 덮어쓰지 말고 필요한 부분만 병합하세요.

## 팀원 API 연결 위치

### 공통 응답 타입

- `src/types/trip.ts`
- UI가 직접 사용하는 `RouteOption`, `TripStatus`, `TripSnapshot`, `TrafficAlert`, `UserPreferences`가 있습니다.
- 실제 백엔드 응답은 이 타입과 동일하게 맞추거나 API adapter에서 변환합니다.

### 2번 개발자: 지도·위치·교통/경로 API

- `src/services/trip-service.ts`의 `LocationProvider`
- `src/services/trip-service.ts`의 `RouteProvider`

```ts
export interface LocationProvider {
  getCurrentLocation(): Promise<CurrentLocation>;
}

export interface RouteProvider {
  searchRoutes(request: StartTripRequest): Promise<RouteOption[]>;
}
```

현재 위치 버튼은 `TripService.getCurrentLocation()`만 호출합니다. 지도 SDK 또는 브라우저 Geolocation API를 연결한 뒤 결과를 `CurrentLocation`으로 변환하면 됩니다.

### 3번 개발자: 정시도착 알고리즘·백엔드/API 통합

- `src/services/trip-service.ts`의 `TripService`
- `src/hooks/use-trip-demo.ts`가 이 서비스만 호출합니다.

```ts
export interface TripService {
  getCurrentLocation(): Promise<CurrentLocation>;
  startTrip(request: StartTripRequest): Promise<TripSnapshot>;
  getTripSnapshot(tripId: string): Promise<TripSnapshot>;
  savePreferences(tripId: string, preferences: UserPreferences): Promise<void>;
  simulateTrafficEvent(tripId: string): Promise<TripSnapshot>;
}
```

실제 연결 시 권장 작업:

1. `ApiTripService implements TripService` 클래스를 새로 만듭니다.
2. `fetch` 또는 팀의 API client를 사용해 백엔드 응답을 `TripSnapshot`으로 변환합니다.
3. `src/services/trip-service.ts` 마지막 줄의 인스턴스만 교체합니다.

```ts
export const tripService: TripService = new ApiTripService();
```

실시간 이벤트는 추후 polling, SSE 또는 WebSocket 중 팀 백엔드 방식에 따라 `getTripSnapshot()`을 반복 호출하거나 새 구독 메서드를 추가하면 됩니다. UI 컴포넌트는 수정할 필요가 없습니다.

## Mock data 위치

- `src/data/mock-trip.ts`
- 초기 안전 상태와 교통체증 발생 이후 상태를 각각 생성합니다.
- `교통 변화 시연` 버튼은 `MockTripService.simulateTrafficEvent()`를 호출합니다.

## 주요 컴포넌트 대응

| 요구 컴포넌트 | 구현 파일 |
| --- | --- |
| `DestinationForm` | `src/components/destination-form.tsx` |
| `TripStatusCard` | `src/components/trip-status-card.tsx` |
| `RiskGauge` | `src/components/risk-gauge.tsx` |
| `RecommendedActionCard` | `src/components/recommended-action-card.tsx` |
| `RouteOptionCard` | `src/components/route-option-card.tsx` |
| `RouteComparison` | `src/components/route-comparison.tsx` |
| `AlertBanner` | `src/components/alert-banner.tsx` |
| `UserPreferencePanel` | `src/components/user-preference-panel.tsx` |

## 해커톤 시연 팁

1. 메인 화면에서 `현재 위치 사용`을 누릅니다.
2. `길찾기 시작`을 눌러 87% 안전 상태를 보여줍니다.
3. 이동 현황 화면의 `교통 변화 시연`을 누릅니다.
4. 정체 경고와 함께 추천 행동이 `다음 정류장에서 내리세요`로 바뀌는 점을 강조합니다.
5. 기존 버스 24%, 지하철 환승 82%, 택시 97%를 비교합니다.
6. 이동 설정에서 택시를 끄고 경로 C가 제외되는 것을 보여줍니다.

