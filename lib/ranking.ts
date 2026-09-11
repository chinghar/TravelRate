import type { Bucket } from './types';

export interface BucketRange {
  min: number;
  max: number;
}

export const BUCKET_RANGES: Record<Bucket, BucketRange> = {
  loved: { min: 6.7, max: 10.0 },
  fine: { min: 3.4, max: 6.6 },
  didnt: { min: 0.0, max: 3.3 },
};

export const BUCKET_LABELS: Record<Bucket, string> = {
  loved: 'Loved it',
  fine: 'It was fine',
  didnt: "Didn't like it",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Score for a single entry given its rank within a bucket (0 = best) and the
 * bucket's total size. Linear interpolation across the bucket's fixed range.
 */
export function computeScore(
  rankInBucket: number,
  bucketSize: number,
  bucket: Bucket
): number {
  const { min, max } = BUCKET_RANGES[bucket];
  if (bucketSize <= 1) {
    return round1((min + max) / 2);
  }
  const fraction = rankInBucket / (bucketSize - 1);
  return round1(max - fraction * (max - min));
}

export interface RankedEntry {
  cityId: string;
  bucket: Bucket;
  rankInBucket: number;
}

/**
 * Recomputes scores for every entry across all buckets. Scores are always
 * derived from rank position — never stored directly.
 */
export function computeAllScores(entries: RankedEntry[]): Map<string, number> {
  const scores = new Map<string, number>();
  const byBucket: Record<Bucket, RankedEntry[]> = {
    loved: [],
    fine: [],
    didnt: [],
  };
  for (const entry of entries) {
    byBucket[entry.bucket].push(entry);
  }
  (Object.keys(byBucket) as Bucket[]).forEach((bucket) => {
    const sorted = byBucket[bucket]
      .slice()
      .sort((a, b) => a.rankInBucket - b.rankInBucket);
    const size = sorted.length;
    sorted.forEach((entry, idx) => {
      scores.set(entry.cityId, computeScore(idx, size, bucket));
    });
  });
  return scores;
}

/** Which score band a given score falls into, e.g. for map pin coloring. */
export function getScoreBand(score: number): Bucket {
  if (score >= BUCKET_RANGES.loved.min) return 'loved';
  if (score >= BUCKET_RANGES.fine.min) return 'fine';
  return 'didnt';
}

/**
 * Binary-search insertion state. `order` is the bucket's existing members
 * sorted best-to-worst (index 0 = best). `lo`/`hi` bound the range of
 * possible insertion indices for the new city; the window narrows on each
 * answer until lo === hi, at which point insertion index is `lo`.
 */
export interface ComparisonState {
  bucket: Bucket;
  order: string[];
  lo: number;
  hi: number;
}

export type ComparisonAnswer = 'new' | 'existing' | 'tooClose';

export function startComparison(
  bucket: Bucket,
  order: string[]
): ComparisonState {
  return { bucket, order, lo: 0, hi: order.length };
}

export function isComparisonDone(state: ComparisonState): boolean {
  return state.lo >= state.hi;
}

/** cityId to compare the new entry against, or undefined if already done. */
export function getCurrentComparisonCityId(
  state: ComparisonState
): string | undefined {
  if (isComparisonDone(state)) return undefined;
  const mid = Math.floor((state.lo + state.hi) / 2);
  return state.order[mid];
}

/** The insertion index once comparison is done. */
export function getInsertIndex(state: ComparisonState): number {
  return state.lo;
}

export function answerComparison(
  state: ComparisonState,
  answer: ComparisonAnswer
): ComparisonState {
  if (isComparisonDone(state)) return state;
  const mid = Math.floor((state.lo + state.hi) / 2);
  if (answer === 'tooClose') {
    return { ...state, lo: mid, hi: mid };
  }
  if (answer === 'new') {
    // New city preferred over the entry at `mid` — it belongs before it.
    return { ...state, hi: mid };
  }
  // Existing entry preferred — new city belongs after it.
  return { ...state, lo: mid + 1 };
}

/** Maximum comparisons a bucket of this existing size could ever require. */
export function maxComparisons(existingBucketSize: number): number {
  if (existingBucketSize <= 0) return 0;
  return Math.ceil(Math.log2(existingBucketSize)) + 1;
}

/** Inserts a cityId into a sorted bucket order at the given index. */
export function insertCityIntoBucket(
  order: string[],
  cityId: string,
  insertIndex: number
): string[] {
  const next = order.slice();
  next.splice(insertIndex, 0, cityId);
  return next;
}

/** Removes a cityId from a bucket order, e.g. before re-ranking it. */
export function removeCityFromBucket(order: string[], cityId: string): string[] {
  return order.filter((id) => id !== cityId);
}
