'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCityData } from '@/lib/useCityData';
import { formatCoordinates } from '@/lib/cities';
import * as db from '@/lib/db';
import ScoreBadge from '@/components/ScoreBadge';
import { ALL_TAGS, type Bucket, type Tag } from '@/lib/types';
import {
  DIMENSIONS,
  OVERALL_DIMENSION_ID,
  getDimension,
  type DimensionId,
} from '@/lib/dimensions';

export default function HomePage() {
  const { getRankedEntries, loaded, refresh } = useCityData();
  const [dimensionId, setDimensionId] = useState<DimensionId>(OVERALL_DIMENSION_ID);
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [openMenuCityId, setOpenMenuCityId] = useState<string | null>(null);

  const dimension = getDimension(dimensionId);
  const rankedEntries = getRankedEntries(dimensionId);

  const filtered = useMemo(() => {
    if (!activeTag) return rankedEntries;
    return rankedEntries.filter((e) => e.tags.includes(activeTag));
  }, [rankedEntries, activeTag]);

  useEffect(() => {
    if (!openMenuCityId) return;
    const close = () => setOpenMenuCityId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuCityId]);

  async function deleteRanking(cityId: string, cityName: string, bucket: Bucket) {
    setOpenMenuCityId(null);
    if (!window.confirm(`Delete ${cityName}'s ${dimension.label.toLowerCase()} ranking?`)) {
      return;
    }
    await db.deleteRankingAndReindex(cityId, dimensionId, bucket);
    refresh();
  }

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

      {loaded && rankedEntries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <h1 className="text-xl font-semibold">{dimension.emptyState}</h1>
          <Link
            href="/add"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
          >
            Rank your first city
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  activeTag === null
                    ? 'bg-ink text-paper'
                    : 'border border-line text-mute hover:text-ink'
                }`}
              >
                All
              </button>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    activeTag === tag
                      ? 'bg-ink text-paper'
                      : 'border border-line text-mute hover:text-ink'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <Link
              href="/add"
              className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              Rank a city
            </Link>
          </div>

          <ol className="flex flex-col border-t border-line">
            {filtered.map((entry, idx) => (
              <li key={entry.city.id} className="border-b border-line">
                <div className="flex items-center gap-2 hover:bg-ink/[0.03]">
                  <Link
                    href={`/city/${entry.city.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4 py-3"
                  >
                    <span className="w-7 shrink-0 font-mono text-sm text-mute">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{entry.city.name}</span>
                      <span className="truncate font-mono text-xs text-mute">
                        {formatCoordinates(entry.city.lat, entry.city.lng)}
                      </span>
                      {entry.tags.length > 0 && (
                        <span className="truncate text-xs text-mute">
                          {entry.tags.join(', ')}
                        </span>
                      )}
                    </div>
                    <ScoreBadge score={entry.score} bucket={entry.bucket} />
                  </Link>
                  <div className="relative shrink-0 pr-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuCityId((prev) =>
                          prev === entry.city.id ? null : entry.city.id
                        );
                      }}
                      aria-label={`Actions for ${entry.city.name}`}
                      className="rounded-full px-2 py-1 text-mute hover:text-ink"
                    >
                      ⋯
                    </button>
                    {openMenuCityId === entry.city.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-full z-10 mt-1 w-44 border border-line bg-paper"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            deleteRanking(entry.city.id, entry.city.name, entry.bucket)
                          }
                          className="block w-full px-3 py-2 text-left text-sm text-mute hover:bg-ink/[0.03] hover:text-ink"
                        >
                          Delete {dimension.label.toLowerCase()} ranking
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-mute">
              No city on this list has that tag.
            </p>
          )}
        </>
      )}
    </div>
  );
}
