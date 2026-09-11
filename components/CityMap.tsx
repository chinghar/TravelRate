'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { useCityData } from '@/lib/useCityData';
import { getScoreBandColorValue } from './ScoreBadge';

export default function CityMap() {
  const router = useRouter();
  const { rankedEntries, loaded } = useCityData();

  return (
    <div className="relative h-[70vh] w-full overflow-hidden border border-line">
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
          const color = getScoreBandColorValue(entry.score);
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
                <div className="flex flex-col items-center leading-tight">
                  <span>{entry.city.name}</span>
                  <span className="font-mono" style={{ color }}>
                    {entry.score.toFixed(1)}
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {loaded && rankedEntries.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          <p className="bg-paper px-4 py-2 text-mute">
            Rank a city to see it on the map.
          </p>
        </div>
      )}
    </div>
  );
}
