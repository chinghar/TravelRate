import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Bucket, RankingRecord, Visit, WishlistItem } from './types';
import { OVERALL_DIMENSION_ID, type DimensionId } from './dimensions';

interface CityRankDBSchema extends DBSchema {
  visits: {
    key: string;
    value: Visit;
  };
  wishlist: {
    key: string;
    value: WishlistItem;
  };
  rankings: {
    key: [string, DimensionId];
    value: RankingRecord;
    indexes: { 'by-dimension': DimensionId };
  };
}

const DB_NAME = 'cityrank';
const DB_VERSION = 2;
const EXPORT_VERSION = 2;

/** Shape of a pre-migration `visits` row, before bucket/rankInBucket were dropped. */
interface LegacyVisitFields {
  cityId: string;
  bucket?: Bucket;
  rankInBucket?: number;
  createdAt?: string;
}

function deriveOverallRanking(legacy: LegacyVisitFields): RankingRecord | null {
  if (!legacy.bucket || typeof legacy.rankInBucket !== 'number') return null;
  return {
    cityId: legacy.cityId,
    dimensionId: OVERALL_DIMENSION_ID,
    bucket: legacy.bucket,
    position: legacy.rankInBucket,
    updatedAt: legacy.createdAt ?? new Date().toISOString(),
  };
}

let dbPromise: Promise<IDBPDatabase<CityRankDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<CityRankDBSchema>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  if (!dbPromise) {
    dbPromise = openDB<CityRankDBSchema>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('visits')) {
          db.createObjectStore('visits', { keyPath: 'cityId' });
        }
        if (!db.objectStoreNames.contains('wishlist')) {
          db.createObjectStore('wishlist', { keyPath: 'cityId' });
        }
        if (!db.objectStoreNames.contains('rankings')) {
          const store = db.createObjectStore('rankings', {
            keyPath: ['cityId', 'dimensionId'],
          });
          store.createIndex('by-dimension', 'dimensionId');
        }
        const rankingsStore = tx.objectStore('rankings');

        if (oldVersion < 2) {
          // Non-destructive, rerunnable: derive 'overall' rankings from
          // existing visits' legacy bucket/rankInBucket. `visits` itself is
          // never modified or cleared here, and `put` makes this safe to
          // run again on already-migrated data.
          const visitsStore = tx.objectStore('visits');
          const allVisits = (await visitsStore.getAll()) as LegacyVisitFields[];
          for (const legacy of allVisits) {
            const record = deriveOverallRanking(legacy);
            if (record) {
              await rankingsStore.put(record);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllVisits(): Promise<Visit[]> {
  const db = await getDB();
  return db.getAll('visits');
}

export async function getVisit(cityId: string): Promise<Visit | undefined> {
  const db = await getDB();
  return db.get('visits', cityId);
}

export async function putVisit(visit: Visit): Promise<void> {
  const db = await getDB();
  await db.put('visits', visit);
}

export async function deleteVisit(cityId: string): Promise<void> {
  const db = await getDB();
  await db.delete('visits', cityId);
}

export async function getAllWishlist(): Promise<WishlistItem[]> {
  const db = await getDB();
  return db.getAll('wishlist');
}

export async function addToWishlist(item: WishlistItem): Promise<void> {
  const db = await getDB();
  await db.put('wishlist', item);
}

export async function removeFromWishlist(cityId: string): Promise<void> {
  const db = await getDB();
  await db.delete('wishlist', cityId);
}

export async function getAllRankings(): Promise<RankingRecord[]> {
  const db = await getDB();
  return db.getAll('rankings');
}

export async function getRankingsForDimension(
  dimensionId: DimensionId
): Promise<RankingRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('rankings', 'by-dimension', dimensionId);
}

export async function getRanking(
  cityId: string,
  dimensionId: DimensionId
): Promise<RankingRecord | undefined> {
  const db = await getDB();
  return db.get('rankings', [cityId, dimensionId]);
}

export async function putRankings(records: RankingRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('rankings', 'readwrite');
  await Promise.all([...records.map((r) => tx.store.put(r)), tx.done]);
}

export async function deleteRanking(
  cityId: string,
  dimensionId: DimensionId
): Promise<void> {
  const db = await getDB();
  await db.delete('rankings', [cityId, dimensionId]);
}

export interface ExportPayloadV2 {
  version: 2;
  exportedAt: string;
  visits: Visit[];
  wishlist: WishlistItem[];
  rankings: RankingRecord[];
}

interface ExportPayloadV1 {
  version: 1;
  exportedAt: string;
  visits: (Visit & LegacyVisitFields)[];
  wishlist: WishlistItem[];
}

export type ExportPayload = ExportPayloadV1 | ExportPayloadV2;

export async function exportAllData(): Promise<ExportPayloadV2> {
  const [visits, wishlist, rankings] = await Promise.all([
    getAllVisits(),
    getAllWishlist(),
    getAllRankings(),
  ]);
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    visits,
    wishlist,
    rankings,
  };
}

export async function importAllData(data: ExportPayload): Promise<void> {
  const db = await getDB();

  const clearTx = db.transaction(['visits', 'wishlist', 'rankings'], 'readwrite');
  await Promise.all([
    clearTx.objectStore('visits').clear(),
    clearTx.objectStore('wishlist').clear(),
    clearTx.objectStore('rankings').clear(),
    clearTx.done,
  ]);

  const writeTx = db.transaction(['visits', 'wishlist', 'rankings'], 'readwrite');
  const visitsStore = writeTx.objectStore('visits');
  const wishlistStore = writeTx.objectStore('wishlist');
  const rankingsStore = writeTx.objectStore('rankings');

  const writes: Promise<unknown>[] = [];
  for (const v of data.visits) writes.push(visitsStore.put(v));
  for (const w of data.wishlist) writes.push(wishlistStore.put(w));

  if (data.version === 2) {
    for (const r of data.rankings) writes.push(rankingsStore.put(r));
  } else {
    for (const legacy of data.visits) {
      const record = deriveOverallRanking(legacy);
      if (record) writes.push(rankingsStore.put(record));
    }
  }

  writes.push(writeTx.done);
  await Promise.all(writes);
}
