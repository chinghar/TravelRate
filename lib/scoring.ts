import type { Bucket } from './types';

/**
 * Each bucket owns a fixed, disjoint score band. Bands never share an
 * endpoint, so no score is ambiguous about which bucket produced it.
 */
export const BUCKET_SCORE_BANDS: Record<Bucket, [min: number, max: number]> = {
  didnt: [0.0, 3.3],
  fine: [3.4, 6.6],
  loved: [6.7, 10.0],
};

export interface RankedEntry {
  cityId: string;
  bucket: Bucket;
  position: number;
}

/**
 * Recomputes scores for every entry in one dimension's ranked list. Each
 * bucket's entries are spaced evenly across that bucket's fixed band,
 * independent of every other bucket:
 *   - best entry in the band gets the band maximum exactly
 *   - worst entry in the band gets the band minimum exactly
 *   - a band holding exactly one entry gets the band midpoint
 *   - a band holding zero entries contributes nothing
 * Scores are always derived — never stored. Returned as the raw computed
 * value; rounding to one decimal place for display is the caller's job.
 */
export function computeAllScores(entries: RankedEntry[]): Map<string, number> {
  const scores = new Map<string, number>();
  const byBucket: Record<Bucket, RankedEntry[]> = { loved: [], fine: [], didnt: [] };
  for (const entry of entries) {
    byBucket[entry.bucket].push(entry);
  }
  (Object.keys(byBucket) as Bucket[]).forEach((bucket) => {
    const sorted = byBucket[bucket].slice().sort((a, b) => a.position - b.position);
    const n = sorted.length;
    if (n === 0) return;
    const [bandMin, bandMax] = BUCKET_SCORE_BANDS[bucket];
    sorted.forEach((entry, i) => {
      const score =
        n === 1 ? (bandMin + bandMax) / 2 : bandMax - (i / (n - 1)) * (bandMax - bandMin);
      scores.set(entry.cityId, score);
    });
  });
  return scores;
}
