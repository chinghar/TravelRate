'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCityById, formatCoordinates } from '@/lib/cities';
import * as db from '@/lib/db';
import { useCityData } from '@/lib/useCityData';
import { BUCKET_LABELS } from '@/lib/ranking';
import ScoreBadge from '@/components/ScoreBadge';
import { ALL_TAGS, type Tag, type Visit, type WishlistItem } from '@/lib/types';

export default function CityDetailClient({ cityId }: { cityId: string }) {
  const city = getCityById(cityId);
  const { rankedEntries, wishlist, loaded, refresh } = useCityData();
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

  const rankIndex = rankedEntries.findIndex((e) => e.city.id === cityId);
  const rankEntry = rankIndex >= 0 ? rankedEntries[rankIndex] : null;
  const bucketPeers = visit
    ? rankedEntries.filter((e) => e.visit.bucket === visit.bucket)
    : [];
  const bucketPosition = visit
    ? bucketPeers.findIndex((e) => e.city.id === cityId)
    : -1;

  function updateVisit(updater: (prev: Visit) => Visit) {
    setVisit((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
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

      {visit && rankEntry && (
        <div className="flex items-center justify-between border-y border-line py-4">
          <div className="flex flex-col text-sm text-mute">
            <span>#{rankIndex + 1} overall</span>
            <span>
              #{bucketPosition + 1} of {bucketPeers.length} in{' '}
              {BUCKET_LABELS[visit.bucket]}
            </span>
          </div>
          <ScoreBadge score={rankEntry.score} size="lg" />
        </div>
      )}

      {visit === undefined && <p className="text-mute">Loading…</p>}

      {visit === null && (
        <div className="flex flex-col gap-3 border-y border-line py-4">
          <p className="text-ink">
            {wishlistItem
              ? "This city is on your want-to-go list. You haven't ranked it."
              : "You haven't ranked this city."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/add?cityId=${cityId}`}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              Rank this city
            </Link>
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
        </div>
      )}

      {visit && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-mute">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    visit.tags.includes(tag)
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
              {visit.dates.map((date) => (
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

          <Link
            href={`/add?cityId=${cityId}`}
            className="self-start rounded-full border border-line px-4 py-2 text-sm font-medium text-mute hover:text-ink"
          >
            Re-rank
          </Link>
        </>
      )}
    </div>
  );
}
