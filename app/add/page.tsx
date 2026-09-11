'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchCities, getCityById } from '@/lib/cities';
import * as db from '@/lib/db';
import {
  BUCKET_LABELS,
  answerComparison,
  computeScore,
  getCurrentComparisonCityId,
  getInsertIndex,
  insertCityIntoBucket,
  isComparisonDone,
  startComparison,
  type ComparisonAnswer,
  type ComparisonState,
} from '@/lib/ranking';
import ScoreBadge from '@/components/ScoreBadge';
import type { Bucket, City, Visit } from '@/lib/types';

type Step = 'search' | 'bucket' | 'compare' | 'confirm';

const BUCKET_ORDER: Bucket[] = ['loved', 'fine', 'didnt'];

function AddFlowInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCityId = searchParams.get('cityId');

  const [step, setStep] = useState<Step>(presetCityId ? 'bucket' : 'search');
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(
    presetCityId ? getCityById(presetCityId) ?? null : null
  );
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [comparisonState, setComparisonState] = useState<ComparisonState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getAllVisits().then(setAllVisits);
  }, []);

  const results = useMemo(
    () => (step === 'search' ? searchCities(query, 25) : []),
    [step, query]
  );

  function chooseCity(city: City) {
    setSelectedCity(city);
    setStep('bucket');
  }

  function chooseBucket(b: Bucket) {
    if (!selectedCity) return;
    setBucket(b);
    const order = allVisits
      .filter((v) => v.bucket === b && v.cityId !== selectedCity.id)
      .sort((a, c) => a.rankInBucket - c.rankInBucket)
      .map((v) => v.cityId);
    const state = startComparison(b, order);
    setComparisonState(state);
    setStep(isComparisonDone(state) ? 'confirm' : 'compare');
  }

  function answer(ans: ComparisonAnswer) {
    if (!comparisonState) return;
    const next = answerComparison(comparisonState, ans);
    setComparisonState(next);
    if (isComparisonDone(next)) setStep('confirm');
  }

  const finalOrder = useMemo(() => {
    if (!comparisonState || !selectedCity || !isComparisonDone(comparisonState)) {
      return null;
    }
    const insertIndex = getInsertIndex(comparisonState);
    return insertCityIntoBucket(comparisonState.order, selectedCity.id, insertIndex);
  }, [comparisonState, selectedCity]);

  const finalScore = useMemo(() => {
    if (!finalOrder || !bucket || !selectedCity) return null;
    const idx = finalOrder.indexOf(selectedCity.id);
    return computeScore(idx, finalOrder.length, bucket);
  }, [finalOrder, bucket, selectedCity]);

  async function commit() {
    if (!finalOrder || !bucket || !selectedCity) return;
    setSaving(true);
    const visits = await db.getAllVisits();
    const visitMap = new Map(visits.map((v) => [v.cityId, v]));
    const self = visitMap.get(selectedCity.id);
    const now = new Date().toISOString();

    const updatedBucketVisits: Visit[] = finalOrder.map((cityId, idx) => {
      if (cityId === selectedCity.id) {
        return {
          cityId,
          bucket,
          rankInBucket: idx,
          tags: self?.tags ?? [],
          notes: self?.notes ?? '',
          dates: self?.dates ?? [],
          createdAt: self?.createdAt ?? now,
        };
      }
      const prev = visitMap.get(cityId)!;
      return { ...prev, bucket, rankInBucket: idx };
    });

    await db.putVisits(updatedBucketVisits);

    if (self && self.bucket !== bucket) {
      const oldBucketRemaining = visits
        .filter((v) => v.bucket === self.bucket && v.cityId !== selectedCity.id)
        .sort((a, c) => a.rankInBucket - c.rankInBucket)
        .map((v, idx) => ({ ...v, rankInBucket: idx }));
      if (oldBucketRemaining.length > 0) {
        await db.putVisits(oldBucketRemaining);
      }
    }

    await db.removeFromWishlist(selectedCity.id);
    router.push(`/city/${selectedCity.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <StepIndicator step={step} />

      {step === 'search' && (
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Which city?</h1>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities…"
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-base outline-none focus:border-stone-500"
          />
          <ul className="flex flex-col divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {results.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => chooseCity(city)}
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
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-stone-400">
                No cities found.
              </li>
            )}
          </ul>
        </div>
      )}

      {step === 'bucket' && selectedCity && (
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">
            How was {selectedCity.name}?
          </h1>
          <div className="flex flex-col gap-2">
            {BUCKET_ORDER.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => chooseBucket(b)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-left font-medium hover:border-stone-900 hover:bg-stone-50"
              >
                {BUCKET_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'compare' &&
        selectedCity &&
        comparisonState &&
        (() => {
          const opponentId = getCurrentComparisonCityId(comparisonState);
          const opponent = opponentId ? getCityById(opponentId) : undefined;
          if (!opponent) return null;
          return (
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl font-semibold">Which did you prefer?</h1>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => answer('new')}
                  className="rounded-xl border-2 border-stone-300 bg-white px-4 py-8 text-center font-semibold hover:border-stone-900"
                >
                  {selectedCity.name}
                </button>
                <button
                  type="button"
                  onClick={() => answer('existing')}
                  className="rounded-xl border-2 border-stone-300 bg-white px-4 py-8 text-center font-semibold hover:border-stone-900"
                >
                  {opponent.name}
                </button>
              </div>
              <button
                type="button"
                onClick={() => answer('tooClose')}
                className="self-center text-sm font-medium text-stone-500 underline hover:text-stone-800"
              >
                Too close to call
              </button>
            </div>
          );
        })()}

      {step === 'confirm' && selectedCity && finalOrder && bucket && finalScore !== null && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <h1 className="text-2xl font-semibold">
            {selectedCity.name} ranked!
          </h1>
          <p className="text-stone-500">
            #{finalOrder.indexOf(selectedCity.id) + 1} of {finalOrder.length} in{' '}
            {BUCKET_LABELS[bucket]}
          </p>
          <ScoreBadge score={finalScore} />
          <button
            type="button"
            disabled={saving}
            onClick={commit}
            className="mt-4 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ['search', 'bucket', 'compare', 'confirm'];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 flex-1 rounded-full ${
            i <= idx ? 'bg-stone-900' : 'bg-stone-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddFlowInner />
    </Suspense>
  );
}
