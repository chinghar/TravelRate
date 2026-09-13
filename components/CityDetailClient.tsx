'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCityById, formatCoordinates } from '@/lib/cities';
import * as db from '@/lib/db';
import { useCityData } from '@/lib/useCityData';
import { BUCKET_LABELS } from '@/lib/ranking';
import { DIMENSIONS, getDimension, type DimensionId } from '@/lib/dimensions';
import ScoreBadge from '@/components/ScoreBadge';
import { ALL_TAGS, type Bucket, type Tag, type Visit, type WishlistItem } from '@/lib/types';

export default function CityDetailClient({ cityId }: { cityId: string }) {
  const city = getCityById(cityId);
  const { wishlist, loaded, refresh, getCityRankings } = useCityData();
  const [visit, setVisit] = useState<Visit | null | undefined>(undefined);
  const [notesDraft, setNotesDraft] = useState('');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    db.getVisit(cityId).then((v) => {
      setVisit(v ?? null);
      setNotesDraft(v?.notes ?? '');
    });
  }, [cityId, loaded]);

  const wishlistItem: WishlistItem | undefined = wishlist.find(
    (w) => w.cityId === cityId
  );

  if (!city) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-lg font-semibold">City not found.</h1>
        <Link href="/" className="text-mute underline">
          Back to your rankings
        </Link>
      </div>
    );
  }

  const cityRankings = getCityRankings(cityId);
  const rankedDimensionIds = new Set(cityRankings.map((r) => r.dimensionId));
  const unrankedDimensions = DIMENSIONS.filter((d) => !rankedDimensionIds.has(d.id));
  const hasAnyRanking = cityRankings.length > 0;

  function updateVisit(updater: (prev: Visit) => Visit) {
    setVisit((prev) => {
      const base: Visit =
        prev ?? { cityId, tags: [], notes: '', dates: [], createdAt: new Date().toISOString() };
      const next = updater(base);
      void db.putVisit(next);
      return next;
    });
  }

  function toggleTag(tag: Tag) {
    updateVisit((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function saveNotes() {
    updateVisit((prev) => ({ ...prev, notes: notesDraft }));
  }

  function addDate() {
    if (!newDate) return;
    updateVisit((prev) => ({ ...prev, dates: [...prev.dates, newDate].sort() }));
    setNewDate('');
  }

  function removeDate(date: string) {
    updateVisit((prev) => ({ ...prev, dates: prev.dates.filter((d) => d !== date) }));
  }

  async function deleteDimensionRanking(dimensionId: DimensionId, bucket: Bucket) {
    if (!city) return;
    const dim = getDimension(dimensionId);
    if (!window.confirm(`Delete ${city.name}'s ${dim.label.toLowerCase()} ranking?`)) {
      return;
    }
    await db.deleteRankingAndReindex(cityId, dimensionId, bucket);
    refresh();
  }

  async function addToWishlist() {
    await db.addToWishlist({ cityId, addedAt: new Date().toISOString() });
    refresh();
  }

  async function removeFromWishlist() {
    await db.removeFromWishlist(cityId);
    refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-mute hover:text-ink">
          ← Your rankings
        </Link>
        <h1 className="mt-1 text-3xl font-semibold">{city.name}</h1>
        <p className="text-mute">
          {city.admin ? `${city.admin}, ` : ''}
          {city.country}
        </p>
        <p className="font-mono text-sm text-mute">
          {formatCoordinates(city.lat, city.lng)}
        </p>
      </div>

      <div>
        {wishlistItem ? (
          <button
            type="button"
            onClick={removeFromWishlist}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-mute hover:text-ink"
          >
            Remove from want to go
          </button>
        ) : (
          <button
            type="button"
            onClick={addToWishlist}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-mute hover:text-ink"
          >
            Add to want to go
          </button>
        )}
      </div>

      {!hasAnyRanking && (
        <div className="flex flex-col gap-3 border-y border-line py-4">
          <p className="text-ink">You haven&apos;t ranked this city.</p>
          <Link
            href={`/add?cityId=${cityId}`}
            className="self-start rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            Rank this city
          </Link>
        </div>
      )}

      {hasAnyRanking && (
        <ul className="flex flex-col border-y border-line">
          {cityRankings.map((r) => {
            const dim = getDimension(r.dimensionId);
            return (
              <li
                key={r.dimensionId}
                className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{dim.label}</span>
                  <span className="text-sm text-mute">
                    #{r.overallPosition + 1} of {r.overallTotal} in {dim.label}
                  </span>
                  <span className="text-sm text-mute">
                    #{r.bucketPosition + 1} of {r.bucketTotal} in {BUCKET_LABELS[r.bucket]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={r.score} bucket={r.bucket} />
                  <Link
                    href={`/add?cityId=${cityId}&dimension=${r.dimensionId}`}
                    className="text-xs font-medium text-mute hover:text-ink"
                  >
                    Re-rank
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteDimensionRanking(r.dimensionId, r.bucket)}
                    className="text-xs font-medium text-mute hover:text-ink"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {unrankedDimensions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-mute">Rank on more</h2>
          <div className="flex flex-wrap gap-2">
            {unrankedDimensions.map((d) => (
              <Link
                key={d.id}
                href={`/add?cityId=${cityId}&dimension=${d.id}`}
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-mute hover:text-ink"
              >
                + {d.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-mute">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                (visit?.tags ?? []).includes(tag)
                  ? 'bg-ink text-paper'
                  : 'border border-line text-mute hover:text-ink'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-mute">Dates visited</h2>
        <div className="flex flex-wrap gap-2">
          {(visit?.dates ?? []).map((date) => (
            <span
              key={date}
              className="flex items-center gap-1 border border-line px-3 py-1 font-mono text-sm"
            >
              {date}
              <button
                type="button"
                onClick={() => removeDate(date)}
                aria-label={`Remove ${date}`}
                className="text-mute hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border border-line px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addDate}
            className="border border-line px-3 py-1.5 text-sm font-medium hover:border-ink"
          >
            Add date
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-mute">Notes</h2>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          placeholder="What did you think of this city?"
          className="border border-line px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
