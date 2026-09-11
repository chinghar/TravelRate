'use client';

import { useCallback, useEffect, useState } from 'react';
import * as db from './db';
import { getCityById } from './cities';
import { computeAllScores } from './ranking';
import type { City, Visit, WishlistItem } from './types';

export interface RankedCityEntry {
  city: City;
  visit: Visit;
  score: number;
}

export interface WishlistCityEntry {
  city: City;
  item: WishlistItem;
}

function loadAll() {
  return Promise.all([db.getAllVisits(), db.getAllWishlist()]);
}

export function useCityData() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return loadAll().then(([v, w]) => {
      setVisits(v);
      setWishlist(w);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    loadAll().then(([v, w]) => {
      setVisits(v);
      setWishlist(w);
      setLoaded(true);
    });
  }, []);

  const scores = computeAllScores(visits);

  const rankedEntries: RankedCityEntry[] = visits
    .map((visit) => {
      const city = getCityById(visit.cityId);
      if (!city) return null;
      return { city, visit, score: scores.get(visit.cityId) ?? 0 };
    })
    .filter((e): e is RankedCityEntry => e !== null)
    .sort((a, b) => b.score - a.score);

  const wishlistEntries: WishlistCityEntry[] = wishlist
    .map((item) => {
      const city = getCityById(item.cityId);
      if (!city) return null;
      return { city, item };
    })
    .filter((e): e is WishlistCityEntry => e !== null)
    .sort((a, b) => (a.item.addedAt < b.item.addedAt ? 1 : -1));

  return { visits, wishlist, rankedEntries, wishlistEntries, loaded, refresh };
}
