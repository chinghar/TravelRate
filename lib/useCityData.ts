'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as db from './db';
import { getCityById } from './cities';
import { BUCKET_ORDER, flattenBucketOrders } from './ranking';
import { computeAllScores } from './scoring';
import { DIMENSIONS, type DimensionId } from './dimensions';
import type { Bucket, City, RankingRecord, Visit, WishlistItem } from './types';

export interface RankedCityEntry {
  city: City;
  bucket: Bucket;
  score: number;
  tags: Visit['tags'];
}

export interface CityDimensionRanking {
  dimensionId: DimensionId;
  bucket: Bucket;
  /** 0-indexed absolute position within the dimension's whole ranked list. */
  position: number;
  total: number;
  score: number;
}

export interface WishlistCityEntry {
  city: City;
  item: WishlistItem;
}

function loadAll() {
  return Promise.all([db.getAllVisits(), db.getAllWishlist(), db.getAllRankings()]);
}

export function useCityData() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return loadAll().then(([v, w, r]) => {
      setVisits(v);
      setWishlist(w);
      setRankings(r);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    loadAll().then(([v, w, r]) => {
      setVisits(v);
      setWishlist(w);
      setRankings(r);
      setLoaded(true);
    });
  }, []);

  const visitByCityId = useMemo(
    () => new Map(visits.map((v) => [v.cityId, v])),
    [visits]
  );

  // Precomputed for every dimension at once: cheap at this data scale, and
  // city detail needs every dimension a city participates in simultaneously.
  const scoresByDimension = useMemo(() => {
    const map = new Map<DimensionId, Map<string, number>>();
    for (const dim of DIMENSIONS) {
      const entries = rankings
        .filter((r) => r.dimensionId === dim.id)
        .map((r) => ({ cityId: r.cityId, bucket: r.bucket, position: r.position }));
      map.set(dim.id, computeAllScores(entries));
    }
    return map;
  }, [rankings]);

  const getRankedEntries = useCallback(
    (dimensionId: DimensionId): RankedCityEntry[] => {
      const scores = scoresByDimension.get(dimensionId);
      if (!scores) return [];
      return rankings
        .filter((r) => r.dimensionId === dimensionId)
        .slice()
        // Rank position, never the (rounded, possibly tied) score — a full
        // band produces duplicate displayed scores by design.
        .sort((a, b) => {
          const bucketDiff = BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket);
          return bucketDiff !== 0 ? bucketDiff : a.position - b.position;
        })
        .map((r) => {
          const city = getCityById(r.cityId);
          if (!city) return null;
          const visit = visitByCityId.get(r.cityId);
          const entry: RankedCityEntry = {
            city,
            bucket: r.bucket,
            score: scores.get(r.cityId) ?? 0,
            tags: visit?.tags ?? [],
          };
          return entry;
        })
        .filter((e): e is RankedCityEntry => e !== null);
    },
    [rankings, scoresByDimension, visitByCityId]
  );

  const getCityRankings = useCallback(
    (cityId: string): CityDimensionRanking[] => {
      const result: CityDimensionRanking[] = [];
      for (const dim of DIMENSIONS) {
        const dimensionRecords = rankings.filter((r) => r.dimensionId === dim.id);
        const record = dimensionRecords.find((r) => r.cityId === cityId);
        if (!record) continue;

        const byBucket: Record<Bucket, string[]> = { loved: [], fine: [], didnt: [] };
        for (const r of dimensionRecords.slice().sort((a, b) => a.position - b.position)) {
          byBucket[r.bucket].push(r.cityId);
        }
        const flat = flattenBucketOrders(byBucket);
        const scores = scoresByDimension.get(dim.id)!;

        result.push({
          dimensionId: dim.id,
          bucket: record.bucket,
          position: flat.indexOf(cityId),
          total: flat.length,
          score: scores.get(cityId) ?? 0,
        });
      }
      return result;
    },
    [rankings, scoresByDimension]
  );

  const wishlistEntries: WishlistCityEntry[] = wishlist
    .map((item) => {
      const city = getCityById(item.cityId);
      if (!city) return null;
      return { city, item };
    })
    .filter((e): e is WishlistCityEntry => e !== null)
    .sort((a, b) => (a.item.addedAt < b.item.addedAt ? 1 : -1));

  /** Every cityId ranked on at least one dimension — used by the map to
   * decide which cities to render at all (colored, or muted if unranked
   * on the currently selected dimension). */
  const rankedCityIds = useMemo(
    () => new Set(rankings.map((r) => r.cityId)),
    [rankings]
  );

  return {
    visits,
    wishlist,
    rankings,
    loaded,
    refresh,
    getRankedEntries,
    getCityRankings,
    wishlistEntries,
    rankedCityIds,
  };
}
