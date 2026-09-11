import type { Bucket } from './types';

export const BUCKET_LABELS: Record<Bucket, string> = {
  loved: 'Loved it',
  fine: 'It was fine',
  didnt: "Didn't like it",
};

/** Buckets determine ordering precedence only — they own no score range. */
export const BUCKET_ORDER: Bucket[] = ['loved', 'fine', 'didnt'];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Score for one entry given its absolute position (0 = best) in a
 * dimension's WHOLE ranked list of `totalCount` entries. Linear
 * interpolation across the entire list: the top entry always scores
 * exactly 10.0; the bottom approaches (never reaches) 0.0; the gap
 * between consecutive ranks is a constant 10 / totalCount.
 */
export function computeScoreAtPosition(position: number, totalCount: number): number {
  if (totalCount <= 0) return 10;
  return round1(10 * (1 - position / totalCount));
}

export interface RankedEntry {
  cityId: string;
  bucket: Bucket;
  position: number;
}

/**
 * Recomputes scores for every entry in one dimension's full ranked list.
 * Buckets only decide precedence (loved, then fine, then didn't); within a
 * bucket, entries are ordered by `position`. Scores are always derived —
 * never stored directly.
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
  const flat = BUCKET_ORDER.flatMap((bucket) =>
    byBucket[bucket].slice().sort((a, b) => a.position - b.position)
  );
  const total = flat.length;
  flat.forEach((entry, i) => {
    scores.set(entry.cityId, computeScoreAtPosition(i, total));
  });
  return scores;
}

/** Flattens per-bucket order arrays into one absolute rank order, best to worst. */
export function flattenBucketOrders(bucketOrders: Record<Bucket, string[]>): string[] {
  return BUCKET_ORDER.flatMap((bucket) => bucketOrders[bucket]);
}

/**
 * Binary-search insertion state. `order` is the bucket's existing members
 * sorted best-to-worst (index 0 = best). `lo`/`hi` bound the range of
 * possible insertion indices for the new city; the window narrows on each
 * answer until lo === hi, at which point insertion index is `lo`.
 *
 * Unchanged from before dimensions existed: this operates on a plain
 * string[] order array and has no awareness of dimensions. Callers decide
 * which dimension+bucket's order array to pass in.
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
  return Math.floor(Math.log2(existingBucketSize)) + 1;
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
