"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/** World choropleth from session counts per ISO country code. */
export function GeoMap({ data }: { data: { value: string; visitors: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          countries: {
            type: "geojson",
            data: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#0B1220" } },
          {
            id: "fill", type: "fill", source: "countries",
            paint: { "fill-color": "#16233E", "fill-opacity": 0.9 },
          },
          { id: "line", type: "line", source: "countries", paint: { "line-color": "#1E2D4D", "line-width": 0.5 } },
        ],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: [10, 30],
      zoom: 1.2,
      attributionControl: false,
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !data.length) return;
    const max = Math.max(...data.map((d) => d.visitors));
    const match: unknown[] = ["match", ["get", "ISO3166-1-Alpha-2"]];
    for (const d of data) {
      match.push(d.value, `rgba(59,130,246,${0.25 + 0.75 * (d.visitors / max)})`);
    }
    match.push("rgba(22,35,62,0.9)");
    const apply = () => m.setPaintProperty("fill", "fill-color", match as never);
    if (m.isSourceLoaded("countries")) apply(); else m.once("sourcedata", apply);
  }, [data]);

  return <div ref={ref} className="h-[420px] w-full rounded-card border border-line" />;
}
