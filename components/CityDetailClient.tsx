'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCityById } from '@/lib/cities';
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
        <h1 className="text-xl font-semibold">City not found</h1>
        <Link href="/" className="text-stone-600 underline">
          Back to rankings
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
        <Link href="/" className="text-sm text-stone-500 hover:underline">
          ← Rankings
        </Link>
        <h1 className="mt-1 text-3xl font-semibold">{city.name}</h1>
        <p className="text-stone-500">
          {city.admin ? `${city.admin}, ` : ''}
          {city.country}
        </p>
      </div>

      {visit && rankEntry && (
        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
          <div>
            <p className="text-sm text-stone-500">
              #{rankIndex + 1} overall · #{bucketPosition + 1} of{' '}
              {bucketPeers.length} in {BUCKET_LABELS[visit.bucket]}
            </p>
          </div>
          <ScoreBadge score={rankEntry.score} />
        </div>
      )}

      {visit === undefined && (
        <p className="text-stone-400">Loading…</p>
      )}

      {visit === null && (
        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-stone-600">
            {wishlistItem
              ? "On your want-to-go list. Haven't ranked it yet."
              : "You haven't ranked this city yet."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/add?cityId=${cityId}`}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              I&apos;ve been here
            </Link>
            {wishlistItem ? (
              <button
                type="button"
                onClick={removeFromWishlist}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Remove from want to go
              </button>
            ) : (
              <button
                type="button"
                onClick={addToWishlist}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
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
            <h2 className="text-sm font-medium text-stone-500">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    visit.tags.includes(tag)
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-stone-500">Dates visited</h2>
            <div className="flex flex-wrap gap-2">
              {visit.dates.map((date) => (
                <span
                  key={date}
                  className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm"
                >
                  {date}
                  <button
                    type="button"
                    onClick={() => removeDate(date)}
                    aria-label={`Remove ${date}`}
                    className="text-stone-400 hover:text-stone-700"
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
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addDate}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
              >
                Add date
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-stone-500">Notes</h2>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="What did you think of this city?"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </div>

          <Link
            href={`/add?cityId=${cityId}`}
            className="self-start rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Re-rank
          </Link>
        </>
      )}
    </div>
  );
}
