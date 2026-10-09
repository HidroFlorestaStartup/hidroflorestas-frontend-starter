// Componente de mapa substituível (somente cliente). Carregado via lazy em MapView.
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { MapPoint } from "./MapView";

function Fit({ points, selected }: { points: MapPoint[]; selected?: string | null }) {
  const map = useMap();
  useEffect(() => {
    const sel = points.find((p) => p.id === selected);
    if (sel) map.setView([sel.lat, sel.lng], Math.max(map.getZoom(), 12));
    else if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng] as [number, number]), { padding: [40, 40] });
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 12);
  }, [map, points, selected]);
  return null;
}

function Picker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) });
  return null;
}

export default function LeafletMap({ points, selectedId, onSelect, onPick, tilesFail, height }: {
  points: MapPoint[]; selectedId?: string | null; onSelect?: (id: string) => void; onPick?: (lat: number, lng: number) => void; tilesFail?: boolean; height: number;
}) {
  const [tileError, setTileError] = useState(false);
  useEffect(() => setTileError(false), [tilesFail]);
  const url = tilesFail ? "https://tiles.invalid.example/{z}/{x}/{y}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [-3.4, -44.35];
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-border" style={{ height }}>
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} keyboard>
        <TileLayer key={url} url={url} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setTileError(true) }} />
        <Fit points={points} selected={selectedId} />
        <Picker onPick={onPick} />
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={p.id === selectedId ? 11 : 8}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: p.id === selectedId ? "#a05a00" : "#1f7a3a", fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect?.(p.id) }}>
            <Tooltip>{p.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {tileError && (
        <div role="status" className="absolute inset-x-3 top-3 z-[500] rounded-[10px] border border-ochre/40 bg-ochre-soft px-3 py-2 text-sm text-foreground">
          Mapa base indisponível. Os pontos e a lista continuam utilizáveis{onPick ? "; informe as coordenadas manualmente se preferir" : ""}.
        </div>
      )}
    </div>
  );
}
