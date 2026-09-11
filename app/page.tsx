'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCityData } from '@/lib/useCityData';
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
        <h1 className="text-2xl font-semibold">No cities ranked yet</h1>
        <p className="max-w-sm text-stone-500">
          Add the first city you&apos;ve visited and start building your ranked list.
        </p>
        <Link
          href="/add"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add a city
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your rankings</h1>
        <Link
          href="/add"
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Add city
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            activeTag === null
              ? 'bg-stone-900 text-white'
              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
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
                ? 'bg-stone-900 text-white'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <ol className="flex flex-col divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {filtered.map((entry, idx) => (
          <li key={entry.city.id}>
            <Link
              href={`/city/${entry.city.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50"
            >
              <span className="w-6 shrink-0 text-right text-sm font-medium text-stone-400">
                {idx + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{entry.city.name}</span>
                <span className="truncate text-sm text-stone-500">
                  {entry.city.admin ? `${entry.city.admin}, ` : ''}
                  {entry.city.country}
                </span>
                {entry.visit.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.visit.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] capitalize text-stone-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ScoreBadge score={entry.score} />
            </Link>
          </li>
        ))}
      </ol>
      {filtered.length === 0 && (
        <p className="py-12 text-center text-stone-500">
          No cities match that tag yet.
        </p>
      )}
    </div>
  );
}
