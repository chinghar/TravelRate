'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCityData } from '@/lib/useCityData';
import { formatCoordinates } from '@/lib/cities';
import ScoreBadge from '@/components/ScoreBadge';
import { ALL_TAGS, type Tag } from '@/lib/types';

export default function HomePage() {
  const { rankedEntries, loaded } = useCityData();
  const [activeTag, setActiveTag] = useState<Tag | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return rankedEntries;
    return rankedEntries.filter((e) => e.visit.tags.includes(activeTag));
  }, [rankedEntries, activeTag]);

  if (loaded && rankedEntries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">You haven&apos;t ranked a city yet.</h1>
        <p className="max-w-sm text-mute">
          Rank the first city you&apos;ve been to.
        </p>
        <Link
          href="/add"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
        >
          Rank your first city
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
            <Link
              href={`/city/${entry.city.id}`}
              className="flex items-center gap-4 py-3 hover:bg-ink/[0.03]"
            >
              <span className="w-7 shrink-0 font-mono text-sm text-mute">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{entry.city.name}</span>
                <span className="truncate font-mono text-xs text-mute">
                  {formatCoordinates(entry.city.lat, entry.city.lng)}
                </span>
                {entry.visit.tags.length > 0 && (
                  <span className="truncate text-xs text-mute">
                    {entry.visit.tags.join(', ')}
                  </span>
                )}
              </div>
              <ScoreBadge score={entry.score} />
            </Link>
          </li>
        ))}
      </ol>
      {filtered.length === 0 && (
        <p className="py-12 text-center text-mute">
          No ranked city has that tag.
        </p>
      )}
    </div>
  );
}
