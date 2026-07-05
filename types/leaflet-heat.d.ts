declare module "leaflet.heat" {
  const _default: unknown;
  export default _default;
}

import "leaflet";
declare module "leaflet" {
  type HeatLatLngTuple = [number, number, number?];
  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }
  interface HeatLayer extends Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatMapOptions): this;
  }
  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatMapOptions,
  ): HeatLayer;
}
