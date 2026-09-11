'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchCities, getCityById, formatCoordinates } from '@/lib/cities';
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
  const [verdictChoice, setVerdictChoice] = useState<'new' | 'existing' | null>(null);
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

  function advanceComparison(ans: ComparisonAnswer, state: ComparisonState) {
    const next = answerComparison(state, ans);
    setComparisonState(next);
    if (isComparisonDone(next)) setStep('confirm');
  }

  function chooseAnswer(ans: ComparisonAnswer) {
    if (!comparisonState || verdictChoice) return;
    if (ans === 'tooClose') {
      advanceComparison(ans, comparisonState);
      return;
    }
    setVerdictChoice(ans);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        advanceComparison(ans, comparisonState);
        setVerdictChoice(null);
      },
      reduced ? 0 : 380
    );
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

  if (step === 'compare' && selectedCity && comparisonState) {
    const opponentId = getCurrentComparisonCityId(comparisonState);
    const opponent = opponentId ? getCityById(opponentId) : undefined;
    if (opponent) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper md:flex-row">
          <button
            type="button"
            onClick={() => chooseAnswer('new')}
            disabled={verdictChoice !== null}
            className={`flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center transition-all duration-300 ${
              verdictChoice === 'new'
                ? 'scale-105 text-signal'
                : verdictChoice === 'existing'
                  ? 'text-paper/30'
                  : ''
            }`}
          >
            <span className="text-3xl font-semibold sm:text-4xl">
              {selectedCity.name}
            </span>
            <span className="font-mono text-sm text-paper/60">
              {formatCoordinates(selectedCity.lat, selectedCity.lng)}
            </span>
          </button>

          <div className="relative flex shrink-0 items-center justify-center px-2 py-3 md:px-3 md:py-2">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-paper/15 md:hidden" />
            <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-paper/15 md:block" />
            <button
              type="button"
              onClick={() => chooseAnswer('tooClose')}
              disabled={verdictChoice !== null}
              className="relative z-10 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper/70 hover:text-paper"
            >
              Too close to call
            </button>
          </div>

          <button
            type="button"
            onClick={() => chooseAnswer('existing')}
            disabled={verdictChoice !== null}
            className={`flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center transition-all duration-300 ${
              verdictChoice === 'existing'
                ? 'scale-105 text-signal'
                : verdictChoice === 'new'
                  ? 'text-paper/30'
                  : ''
            }`}
          >
            <span className="text-3xl font-semibold sm:text-4xl">
              {opponent.name}
            </span>
            <span className="font-mono text-sm text-paper/60">
              {formatCoordinates(opponent.lat, opponent.lng)}
            </span>
          </button>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <StepIndicator step={step} />

      {step === 'search' && (
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">Which city?</h1>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities…"
            className="border-b border-line bg-transparent px-1 py-2.5 text-base"
          />
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {results.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => chooseCity(city)}
                  className="flex w-full flex-col py-2.5 text-left hover:bg-ink/[0.03]"
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-sm text-mute">
                    {city.admin ? `${city.admin}, ` : ''}
                    {city.country}
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="py-6 text-center text-sm text-mute">
                No city matches that search.
              </li>
            )}
          </ul>
        </div>
      )}

      {step === 'bucket' && selectedCity && (
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">
            How was {selectedCity.name}?
          </h1>
          <div className="flex flex-col gap-2">
            {BUCKET_ORDER.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => chooseBucket(b)}
                className="border border-line px-4 py-3 text-left font-medium hover:border-ink"
              >
                {BUCKET_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'confirm' && selectedCity && finalOrder && bucket && finalScore !== null && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <h1 className="text-xl font-semibold">{selectedCity.name} is ranked.</h1>
          <p className="text-mute">
            #{finalOrder.indexOf(selectedCity.id) + 1} of {finalOrder.length} in{' '}
            {BUCKET_LABELS[bucket]}
          </p>
          <ScoreBadge score={finalScore} size="lg" />
          <button
            type="button"
            disabled={saving}
            onClick={commit}
            className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'View ranking'}
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
          className={`h-1 flex-1 ${i <= idx ? 'bg-ink' : 'bg-line'}`}
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
