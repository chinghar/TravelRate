'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { searchCities } from '@/lib/cities';
import * as db from '@/lib/db';
import { useCityData } from '@/lib/useCityData';

export default function WishlistPage() {
  const { wishlistEntries, visits, loaded, refresh } = useCityData();
  const [query, setQuery] = useState('');

  const visitedIds = useMemo(() => new Set(visits.map((v) => v.cityId)), [visits]);
  const wishlistIds = useMemo(
    () => new Set(wishlistEntries.map((e) => e.city.id)),
    [wishlistEntries]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCities(query, 10).filter(
      (c) => !visitedIds.has(c.id) && !wishlistIds.has(c.id)
    );
  }, [query, visitedIds, wishlistIds]);

  async function addCity(cityId: string) {
    await db.addToWishlist({ cityId, addedAt: new Date().toISOString() });
    setQuery('');
    refresh();
  }

  async function remove(cityId: string) {
    await db.removeFromWishlist(cityId);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Want to go</h1>

      <div className="flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city to add…"
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-base outline-none focus:border-stone-500"
        />
        {results.length > 0 && (
          <ul className="flex flex-col divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {results.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => addCity(city.id)}
                  className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-stone-50"
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-sm text-stone-500">
                    {city.admin ? `${city.admin}, ` : ''}
                    {city.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loaded && wishlistEntries.length === 0 && (
        <p className="py-12 text-center text-stone-500">
          Nothing on your want-to-go list yet.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {wishlistEntries.map(({ city }) => (
          <li key={city.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/city/${city.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{city.name}</span>
              <span className="block truncate text-sm text-stone-500">
                {city.admin ? `${city.admin}, ` : ''}
                {city.country}
              </span>
            </Link>
            <Link
              href={`/add?cityId=${city.id}`}
              className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
            >
              I&apos;ve been here
            </Link>
            <button
              type="button"
              onClick={() => remove(city.id)}
              aria-label={`Remove ${city.name}`}
              className="shrink-0 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
