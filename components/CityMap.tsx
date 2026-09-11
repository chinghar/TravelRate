'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { useCityData } from '@/lib/useCityData';
import { SCORE_BAND_COLORS } from './ScoreBadge';
import { getScoreBand } from '@/lib/ranking';

export default function CityMap() {
  const router = useRouter();
  const { rankedEntries, loaded } = useCityData();

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-stone-200">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        worldCopyJump
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {rankedEntries.map((entry) => {
          const band = getScoreBand(entry.score);
          const color = SCORE_BAND_COLORS[band];
          return (
            <CircleMarker
              key={entry.city.id}
              center={[entry.city.lat, entry.city.lng]}
              radius={7}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => router.push(`/city/${entry.city.id}`),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {entry.city.name} · {entry.score.toFixed(1)}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {loaded && rankedEntries.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          <p className="rounded-lg bg-white/90 px-4 py-2 text-stone-500 shadow">
            Rank a city to see it on the map.
          </p>
        </div>
      )}
    </div>
  );
}
