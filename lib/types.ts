export type Bucket = 'loved' | 'fine' | 'didnt';

export type Tag =
  | 'food'
  | 'nightlife'
  | 'nature'
  | 'walkability'
  | 'architecture'
  | 'value';

export const ALL_TAGS: Tag[] = [
  'food',
  'nightlife',
  'nature',
  'walkability',
  'architecture',
  'value',
];

export interface City {
  id: string;
  name: string;
  country: string;
  admin: string;
  lat: number;
  lng: number;
  population: number;
}

export interface Visit {
  cityId: string;
  bucket: Bucket;
  rankInBucket: number;
  tags: Tag[];
  notes: string;
  dates: string[];
  createdAt: string;
}

export interface WishlistItem {
  cityId: string;
  addedAt: string;
}
