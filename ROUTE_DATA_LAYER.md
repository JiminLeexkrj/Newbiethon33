# 해커톤 Route Data Layer (2번 개발자)

이 프로젝트는 UI 전체나 지각 위험도 알고리즘을 구현하지 않습니다. 아래 흐름만 완성한 독립 실행형 Next.js 모듈입니다.

> 브라우저 현재 위치 → 목적지 좌표 검색 → 대중교통/자동차 후보 경로 2~4개 → 지도 표시 → 현재 위치 기준 재탐색

API 키가 없거나 외부 API가 실패하면 같은 응답 타입의 Demo Provider로 자동 전환됩니다. 발표 시에는 `mode=demo`를 사용하면 30초 뒤 교통체증과 대체 경로 등장 시나리오를 항상 재현할 수 있습니다.

## 0. 바로 실행하기

Node.js 20 이상을 권장합니다.

```bash
npm install
```

macOS/Linux:

```bash
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. API 키를 아직 넣지 않았어도 Auto fallback 또는 Demo 고정 모드로 실행됩니다.

현재 위치는 브라우저 보안 정책상 HTTPS 또는 `localhost`에서만 정상 동작합니다. 위치 권한을 거절한 경우 예제 화면의 `서울시청 좌표 사용` 버튼으로 테스트할 수 있습니다.

---

## 1. 사용할 API 선정 이유

| 담당 기능 | 선택 API | 선정 이유 | 실패 시 처리 |
| --- | --- | --- | --- |
| 지도, 마커, Polyline | Kakao Maps JavaScript SDK | 국내 지도 품질이 좋고 JavaScript 키 발급과 웹 도메인 등록이 빠름 | 좌표 기반 SVG 경로 도식 표시 |
| `서울역` 같은 장소 검색 | Kakao Local REST API | 키워드 검색 결과에서 이름, 주소, WGS84 좌표를 바로 얻음 | 서울역·고려대·강남역·서울시청 Mock 검색 |
| 버스/지하철 후보 경로 | ODsay 대중교통 길찾기 v1.8 | 버스·지하철·도보 조합과 여러 후보, 시간·요금·구간 정보를 한 요청으로 얻음 | Demo Provider 경로 |
| 자동차/택시 후보, 도로 교통 | Kakao Mobility 자동차 길찾기 | 현재 교통 속도·상태를 반영한 시간, 거리, 택시 예상요금, 경로 좌표 제공 | 대중교통만 반환하거나 전체 실패 시 Demo Provider |

### 왜 TMAP 대중교통을 1순위로 선택하지 않았는가

TMAP 대중교통도 기술적으로 적합하고 단일 `appKey`를 사용한다는 장점이 있습니다. 다만 2026-09-12 공식 안내의 FREE 한도는 대중교통 경로 API 10건/일이고, 사용 전에 앱 생성과 상품 사용 신청 절차가 있습니다. 위치 변화에 따른 재탐색을 반복하는 해커톤 데모에는 한도가 너무 작아 ODsay를 우선 선택했습니다.

- TMAP 대중교통 API: <https://tmap-public-skopenapi.readme.io/reference/%EB%8C%80%EC%A4%91%EA%B5%90%ED%86%B5-api>
- TMAP 대중교통 이용 절차: <https://transit.tmapmobility.com/guide>
- TMAP 대중교통 상품/요금: <https://transit.tmapmobility.com/>

### 실시간 범위

- Kakao Mobility 자동차 시간은 현재 도로 교통정보를 반영합니다.
- ODsay의 기본 대중교통 길찾기는 운행·배차 정보를 이용한 후보 경로 데이터입니다. 모든 버스의 실제 도착 위치가 반영된다는 의미는 아닙니다.
- ODsay 실시간 버스 도착 API 연결은 후속 확장으로 남겼습니다. 해커톤 1차 목표에서는 경로 후보 반환과 실패 없는 시연을 우선합니다.
- `RawRoute.isRealtime`은 실제 교통정보 반영 여부를 구분합니다. 현재 구현에서 Kakao 자동차 경로만 `true`, ODsay와 Mock은 `false`입니다.

공식 문서:

- Kakao Maps Web API: <https://apis.map.kakao.com/web/guide/>
- Kakao Local 키워드 검색: <https://developers.kakao.com/docs/ko/local/dev-guide#search-by-keyword>
- Kakao Mobility 자동차 길찾기: <https://developers.kakaomobility.com/guide/navi-api/directions.html>
- ODsay API 가이드: <https://lab.odsay.com/guide/guide>
- ODsay API 레퍼런스: <https://lab.odsay.com/guide/releaseReference>

---

## 2. API Key 발급 방법

### 2-1. Kakao 키 2개

1. <https://developers.kakao.com>에 카카오 계정으로 로그인합니다.
2. 오른쪽 위 `앱` → `앱 생성`에서 해커톤 앱을 만듭니다.
3. 해당 앱의 `앱` → `플랫폼 키`로 이동합니다.
4. `REST API 키`를 복사합니다.
   - Kakao Local 장소 검색에 사용합니다.
   - Kakao Mobility 자동차 길찾기에도 같은 REST API 키를 사용합니다.
5. `JavaScript 키`를 복사합니다.
6. JavaScript 키 설정에서 JavaScript SDK 도메인을 등록합니다.
   - 로컬: `http://localhost:3000`
   - 배포: 실제 프론트엔드 Origin 예: `https://team-project.vercel.app`
7. REST API 키의 허용 IP를 제한했다면 Next.js 서버의 발신 IP를 등록합니다. 해커톤 중 IP가 자주 바뀐다면 테스트 단계에서 해당 제한 설정을 다시 확인합니다.

주의: `REST API 키`는 서버 환경변수에만 넣고 Git에 올리지 않습니다. `JavaScript 키`는 브라우저 지도 SDK용이므로 `NEXT_PUBLIC_` 환경변수로 사용합니다.

### 2-2. ODsay 키

1. <https://lab.odsay.com>에서 회원가입/로그인합니다.
2. `Application` → `애플리케이션 등록`으로 이동합니다.
3. 해커톤 앱을 만들고 무료 개발용 서비스 유형을 선택합니다.
4. 이 구현은 Next.js Route Handler에서 ODsay를 호출하므로 `Server` 플랫폼 키를 사용합니다.
5. 실행 서버의 외부 발신 IP를 등록하고 발급된 키를 복사합니다.
6. 등록 정보 변경 반영에는 공식 가이드상 최대 1분이 걸릴 수 있습니다.

ODsay는 플랫폼마다 URI/IP 등록 방식이 다릅니다. Vercel처럼 고정 발신 IP를 보장하지 않는 서버리스 환경에서는 Server 키의 IP 제한과 맞지 않을 수 있습니다. 발표용 로컬 서버나 고정 IP 서버를 사용하거나, 그 시간이 없으면 `mode=demo`로 시연하십시오.

무료 호출 한도와 정책은 변경될 수 있으므로 등록 화면에 표시되는 현재 Basic 한도를 최종 확인합니다.

---

## 3. 환경변수 설정

`.env.example`을 `.env.local`로 복사한 뒤 다음처럼 입력합니다.

```dotenv
NEXT_PUBLIC_KAKAO_MAP_JAVASCRIPT_KEY=카카오_JavaScript_키
KAKAO_REST_API_KEY=카카오_REST_API_키
ODSAY_API_KEY=ODsay_Server_키

ROUTE_DATA_MODE=auto
DEMO_CONGESTION_AFTER_SECONDS=30
```

### `ROUTE_DATA_MODE`

| 값 | 동작 | 추천 용도 |
| --- | --- | --- |
| `auto` | 실제 API를 시도하고, 모두 실패하면 Mock 반환 | 개발 기본값 |
| `live` | 실제 API만 사용하고 실패 시 HTTP 502 | API 연동 확인 |
| `demo` | 항상 Mock 반환 | 발표 시연 |

요청별로 `/api/routes?...&mode=demo`처럼 환경변수를 덮어쓸 수도 있습니다. `demo=true`도 `mode=demo`의 별칭으로 지원합니다.

환경변수를 수정한 뒤에는 개발 서버를 `Ctrl+C`로 종료하고 `npm run dev`로 다시 실행해야 합니다.

---

## 4. 폴더 구조

```text
.
├─ app/
│  ├─ api/
│  │  ├─ places/route.ts        # 목적지 검색 GET API
│  │  └─ routes/route.ts        # 후보 경로 GET API
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx                  # 개발용 최소 검증 화면
├─ components/
│  ├─ examples/
│  │  └─ RouteDataPlayground.tsx
│  └─ map/
│     └─ RouteMap.tsx           # 1번 개발자가 가져갈 지도 컴포넌트
├─ hooks/
│  ├─ use-current-position.ts
│  └─ use-routes.ts
├─ lib/
│  ├─ http/query.ts             # 좌표/쿼리 검증
│  ├─ location/geolocation.ts   # get/watchCurrentPosition
│  ├─ places/
│  │  ├─ kakao.ts
│  │  └─ mock.ts
│  └─ routes/
│     ├─ client.ts              # 프론트엔드용 함수 3개
│     ├─ geometry.ts
│     ├─ mock.ts                # 30초 Demo 시나리오
│     ├─ service.ts             # provider 병렬 호출 및 fallback
│     ├─ time.ts
│     ├─ types.ts               # 팀 공용 계약 타입
│     └─ providers/
│        ├─ kakao-mobility.ts
│        └─ odsay.ts
├─ types/kakao-maps.d.ts
├─ .env.example
└─ README.md
```

---

## 5. 전체 구현 코드의 핵심

전체 코드는 이 프로젝트 폴더에 들어 있습니다. 팀 통합 시 아래 파일을 우선 공유하면 됩니다.

- 공용 타입: `lib/routes/types.ts`
- 프론트 함수: `lib/routes/client.ts`
- 브라우저 위치: `lib/location/geolocation.ts`
- 지도 컴포넌트: `components/map/RouteMap.tsx`
- 최종 API: `app/api/routes/route.ts`
- provider 통합/fallback: `lib/routes/service.ts`

### 좌표 순서 주의

팀 공용 타입은 읽기 쉽게 `{ lat, lng }`를 사용합니다.

```ts
type Coordinate = {
  lat: number;
  lng: number;
};
```

Kakao Mobility와 ODsay 요청은 `경도, 위도` 순서를 요구합니다. provider 내부에서 각각 `lng → X`, `lat → Y`로 변환하므로 외부 팀원은 항상 `{ lat, lng }`만 사용하면 됩니다.

### 현재 위치 함수

```ts
import {
  getCurrentPosition,
  watchCurrentPosition,
} from "@/lib/location/geolocation";

const origin = await getCurrentPosition();

const stop = watchCurrentPosition((nextOrigin) => {
  console.log("새 위치", nextOrigin);
});

// 컴포넌트 종료 시
stop();
```

### 목적지와 경로 함수

```ts
import {
  getRoutes,
  refreshRoutes,
  searchPlace,
} from "@/lib/routes/client";

const places = await searchPlace("고려대학교", { origin });
const destination = places[0];

const first = await getRoutes(origin, destination, { mode: "auto" });
const refreshed = await refreshRoutes(origin, destination, { mode: "auto" });
```

---

## 6. API 테스트 방법

먼저 개발 서버를 실행합니다.

```bash
npm run dev
```

### 6-1. 목적지 검색

브라우저 또는 curl:

```bash
curl "http://localhost:3000/api/places?keyword=고려대학교&mode=demo"
```

실제 Kakao Local만 확인:

```bash
curl "http://localhost:3000/api/places?keyword=서울역&mode=live"
```

### 6-2. 후보 경로

서울시청 → 고려대학교 예시:

```bash
curl "http://localhost:3000/api/routes?originLat=37.5666103&originLng=126.9783882&destinationLat=37.5893876&destinationLng=127.0324773&mode=auto"
```

실제 provider만 확인하려면 `mode=live`, 무조건 Mock을 확인하려면 `mode=demo`로 바꿉니다.

### 6-3. Demo 교통체증 이벤트

시작 시점—현재 경로 38분:

```bash
curl "http://localhost:3000/api/routes?originLat=37.5666103&originLng=126.9783882&destinationLat=37.5893876&destinationLng=127.0324773&mode=demo&demoElapsedSeconds=0"
```

30초 후—기존 경로 46분, 대체 경로 34분:

```bash
curl "http://localhost:3000/api/routes?originLat=37.5666103&originLng=126.9783882&destinationLat=37.5893876&destinationLng=127.0324773&mode=demo&demoElapsedSeconds=30"
```

예제 웹 화면은 30초 간격으로 자동 재탐색하므로 `Demo 고정`을 선택한 뒤 기다리면 같은 변화가 나타납니다.

### 6-4. 잘못된 좌표 검증

```bash
curl -i "http://localhost:3000/api/routes?originLat=999&originLng=126.9&destinationLat=37.5&destinationLng=127.0"
```

HTTP 400과 `INVALID_QUERY`가 반환되어야 합니다.

### 6-5. 정적 검사와 빌드

```bash
npm run typecheck
npm run build
```

---

## 7. Mock / Demo Mode 구현

Demo Provider는 실제 provider와 똑같은 `RoutesResponse`를 반환합니다. 3번 개발자의 추천 알고리즘은 데이터 출처에 관계없이 같은 코드를 사용할 수 있습니다.

| 시점 | `demo-current-route` | `demo-alternative-route` | 설명 |
| --- | ---: | ---: | --- |
| 0~29초 | 38분 | 43분 | 현재 경로가 더 빠름 |
| 30초 이후 | 46분 | 34분 | 체증 발생, 대체 경로가 더 빠름 |

추가로 버스 경로와 택시 가정 경로까지 총 4개를 반환합니다. 모든 경로에는 지도용 Mock polyline과 구간 정보가 포함됩니다.

### 발표 때 권장 설정

1. `.env.local`에 `ROUTE_DATA_MODE=demo`를 넣습니다.
2. 개발 서버를 다시 시작합니다.
3. 위치 권한을 허용하거나 `서울시청 좌표 사용`을 누릅니다.
4. 목적지를 `고려대학교`로 검색합니다.
5. 최초 38분 경로를 보여준 뒤 30초 후 46분/34분 변화와 재탐색을 보여줍니다.

Kakao 지도 키까지 실패하면 `RouteMap`이 자동으로 좌표 기반 경로 도식을 표시하므로 경로 변화 자체는 시연할 수 있습니다.

---

## 8. 1번과 3번 개발자가 사용하는 인터페이스

### 8-1. 1번 개발자: 지도 컴포넌트

```tsx
import { RouteMap } from "@/components/map/RouteMap";

<RouteMap
  origin={currentPosition}
  destination={selectedPlace}
  route={routes[0]}
  className="h-[420px]"
/>
```

Props:

```ts
type RouteMapProps = {
  origin: Coordinate;
  destination: Coordinate;
  route?: RawRoute | null;
  className?: string;
};
```

표시 항목:

- 현재 위치 배지
- 목적지 배지
- 선택한 경로 Polyline
- 전체 경로가 보이도록 자동 bounds 조정
- Kakao 지도 실패 시 경로 도식 fallback

1번 개발자는 후보 카드 디자인과 어떤 `route`를 선택할지만 담당하면 됩니다.

### 8-2. 3번 개발자: HTTP API

```http
GET /api/routes?originLat=37.5666103&originLng=126.9783882&destinationLat=37.5893876&destinationLng=127.0324773
```

정상 응답 예시:

```json
{
  "routes": [
    {
      "id": "odsay-transit-1",
      "mode": "MIXED",
      "durationMinutes": 32,
      "distanceMeters": 7200,
      "estimatedArrivalTime": "09:54",
      "fare": 1500,
      "segments": [
        {
          "mode": "WALK",
          "from": "현재 위치",
          "to": "시청앞 정류장",
          "durationMinutes": 5,
          "distanceMeters": 420
        }
      ],
      "polyline": [{ "lat": 37.5666, "lng": 126.9783 }],
      "provider": "ODSAY",
      "isRealtime": false,
      "fetchedAt": "2026-09-12T04:00:00.000Z"
    }
  ],
  "generatedAt": "2026-09-12T04:00:00.000Z",
  "source": "live",
  "providers": ["ODSAY", "KAKAO_MOBILITY"]
}
```

3번 개발자가 반드시 사용해야 하는 필드는 처음 요구한 `RawRoute` 필드와 동일합니다.

```ts
type RawRoute = {
  id: string;
  mode: "WALK" | "BUS" | "SUBWAY" | "CAR" | "MIXED";
  durationMinutes: number;
  distanceMeters: number;
  estimatedArrivalTime: string;
  fare?: number;
  segments: RouteSegment[];
};
```

`polyline`, `provider`, `isRealtime`, `fetchedAt`은 확장 필드이므로 추천 알고리즘에서 무시해도 됩니다.

### 8-3. 갱신 방식

- 시간 기반: `refreshRoutes(origin, destination)`를 30~60초마다 호출
- 위치 기반: `watchCurrentPosition()` 결과가 충분히 달라졌을 때 호출
- 예제 hook: `useRoutes({ ..., refreshEveryMs: 30_000 })`
- Route Handler는 `Cache-Control: no-store`를 설정하므로 매 호출이 새 요청입니다.

위치 `watchPosition()`은 잦게 호출될 수 있습니다. 실제 통합에서는 50~100m 이상 이동했거나 마지막 조회 후 20~30초가 지났을 때만 재탐색하도록 3번 개발자의 통합 계층에서 throttle하는 것을 권장합니다.

### 8-4. fallback 판별

```ts
if (response.source === "mock") {
  console.log(response.fallbackReason);
  console.log(response.demo?.scenario);
}
```

`auto`에서 ODsay 또는 Kakao Mobility 중 하나만 성공하면 성공한 실제 경로만 반환하고, 실패한 provider 정보는 `warnings`에 넣습니다. 두 provider가 모두 실패할 때만 전체 Mock 응답으로 전환합니다. 실제 데이터와 Mock 데이터를 한 배열에 섞지 않아 알고리즘이 가짜 경로를 실제 경로로 오인하지 않게 했습니다.

---

## 해커톤 작업 우선순위

1. API 키 없이 Demo Mode로 전체 흐름 확인
2. Kakao JavaScript 키로 실제 지도 표시
3. Kakao REST 키로 장소 검색과 자동차 경로 확인
4. ODsay 키로 대중교통 후보 2~3개 확인
5. 마지막에 1번 UI와 3번 알고리즘에 `types.ts`, `/api/routes`, `RouteMap` 연결

추가 기능보다 위 순서를 먼저 완료하십시오. 실시간 버스 도착정보, WebSocket, 경로 저장, 사용자 인증은 이번 담당 범위에 포함하지 않았습니다.
