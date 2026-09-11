import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Visit, WishlistItem } from './types';

interface CityRankDBSchema extends DBSchema {
  visits: {
    key: string;
    value: Visit;
  };
  wishlist: {
    key: string;
    value: WishlistItem;
  };
}

const DB_NAME = 'cityrank';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CityRankDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<CityRankDBSchema>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  if (!dbPromise) {
    dbPromise = openDB<CityRankDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('visits')) {
          db.createObjectStore('visits', { keyPath: 'cityId' });
        }
        if (!db.objectStoreNames.contains('wishlist')) {
          db.createObjectStore('wishlist', { keyPath: 'cityId' });
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

export async function putVisits(visits: Visit[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('visits', 'readwrite');
  await Promise.all([...visits.map((v) => tx.store.put(v)), tx.done]);
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

export interface ExportPayload {
  version: number;
  exportedAt: string;
  visits: Visit[];
  wishlist: WishlistItem[];
}

export async function exportAllData(): Promise<ExportPayload> {
  const [visits, wishlist] = await Promise.all([getAllVisits(), getAllWishlist()]);
  return { version: DB_VERSION, exportedAt: new Date().toISOString(), visits, wishlist };
}

export async function importAllData(data: ExportPayload): Promise<void> {
  const db = await getDB();
  const tx1 = db.transaction('visits', 'readwrite');
  await tx1.store.clear();
  await Promise.all([...data.visits.map((v) => tx1.store.put(v)), tx1.done]);
  const tx2 = db.transaction('wishlist', 'readwrite');
  await tx2.store.clear();
  await Promise.all([...data.wishlist.map((w) => tx2.store.put(w)), tx2.done]);
}
