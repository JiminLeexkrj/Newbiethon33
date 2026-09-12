export {};

declare global {
  namespace kakao.maps {
    function load(callback: () => void): void;

    class LatLng {
      constructor(latitude: number, longitude: number);
      getLat(): number;
      getLng(): number;
    }

    class LatLngBounds {
      constructor();
      extend(latLng: LatLng): void;
    }

    class Map {
      constructor(
        container: HTMLElement,
        options: { center: LatLng; level?: number },
      );
      setCenter(latLng: LatLng): void;
      setBounds(
        bounds: LatLngBounds,
        paddingTop?: number,
        paddingRight?: number,
        paddingBottom?: number,
        paddingLeft?: number,
      ): void;
      relayout(): void;
    }

    class Polyline {
      constructor(options: {
        map?: Map;
        path: LatLng[];
        strokeWeight?: number;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeStyle?: string;
      });
      setMap(map: Map | null): void;
    }

    class CustomOverlay {
      constructor(options: {
        map?: Map;
        position: LatLng;
        content: HTMLElement | string;
        xAnchor?: number;
        yAnchor?: number;
        zIndex?: number;
      });
      setMap(map: Map | null): void;
    }
  }

  interface Window {
    kakao?: {
      maps: typeof kakao.maps;
    };
  }
}

