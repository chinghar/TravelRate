'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCityData } from '@/lib/useCityData';
import { getCityById } from '@/lib/cities';
import { getBandColorValue } from './ScoreBadge';
import {
  DIMENSIONS,
  OVERALL_DIMENSION_ID,
  type DimensionId,
} from '@/lib/dimensions';
import type { City } from '@/lib/types';

export default function CityMap() {
  const router = useRouter();
  const [dimensionId, setDimensionId] = useState<DimensionId>(OVERALL_DIMENSION_ID);
  const { getRankedEntries, rankedCityIds, loaded } = useCityData();

  const dimensionEntries = getRankedEntries(dimensionId);
  const scoreByCityId = useMemo(
    () => new Map(dimensionEntries.map((e) => [e.city.id, e])),
    [dimensionEntries]
  );

  const pins = useMemo(() => {
    return Array.from(rankedCityIds)
      .map((cityId) => getCityById(cityId))
      .filter((c): c is City => c !== undefined);
  }, [rankedCityIds]);

  const mutedColor = getBandColorValue('didnt');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 overflow-x-auto border-b border-line">
        {DIMENSIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDimensionId(d.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 pb-2 text-sm font-medium ${
              dimensionId === d.id
                ? 'border-ink text-ink'
                : 'border-transparent text-mute hover:text-ink'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

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
          {pins.map((city) => {
            const entry = scoreByCityId.get(city.id);
            const color = entry ? getBandColorValue(entry.bucket) : mutedColor;
            return (
              <CircleMarker
                key={city.id}
                center={[city.lat, city.lng]}
                radius={7}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: entry ? 0.85 : 0,
                  weight: 1.5,
                }}
                eventHandlers={{
                  click: () => router.push(`/city/${city.id}`),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <div className="flex flex-col items-center leading-tight">
                    <span>{city.name}</span>
                    {entry ? (
                      <span className="font-mono" style={{ color }}>
                        {entry.score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: mutedColor }}>
                        not ranked
                      </span>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
        {loaded && pins.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
            <p className="bg-paper px-4 py-2 text-mute">
              Rank a city to see it on the map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
