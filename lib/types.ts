import type { DimensionId } from './dimensions';
import { SECONDARY_DIMENSIONS } from './dimensions';

export type Bucket = 'loved' | 'fine' | 'didnt';

/** Descriptive labels only — the same set as the non-overall dimensions, never a rank. */
export type Tag = Exclude<DimensionId, 'overall'>;

export const ALL_TAGS: Tag[] = SECONDARY_DIMENSIONS.map((d) => d.id as Tag);

export interface City {
  id: string;
  name: string;
  country: string;
  admin: string;
  lat: number;
  lng: number;
  population: number;
}

/** Purely descriptive per-city record. Carries no ordering data. */
export interface Visit {
  cityId: string;
  tags: Tag[];
  notes: string;
  dates: string[];
  createdAt: string;
}

/** One row per (cityId, dimensionId). `position` is the index within `bucket`. */
export interface RankingRecord {
  cityId: string;
  dimensionId: DimensionId;
  bucket: Bucket;
  position: number;
  updatedAt: string;
}

export interface WishlistItem {
  cityId: string;
  addedAt: string;
}
