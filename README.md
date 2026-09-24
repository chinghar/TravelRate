# CityRank

Log the cities you've visited, rank them through forced head-to-head
comparisons, and see a scored ranked list and a map. Beli, but for cities.

Everything runs client-side — IndexedDB for storage, a bundled dataset of
~1,500 world cities, and Leaflet/OpenStreetMap for the map. No accounts, no
database, no environment variables.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

```bash
vercel --prod
```

No configuration required — a fresh clone deploys and works immediately.

## How ranking works

1. Add a city and pick a coarse bucket: **Loved it**, **It was fine**, or
   **Didn't like it**. Each bucket owns a fixed score range.
2. The new city is placed within its bucket via binary-search insertion:
   you're shown one existing city at a time and asked which you preferred
   (or "too close to call" to stop early). This takes O(log n) comparisons.
3. Scores are computed by interpolating linearly across the bucket's range
   based on final rank position — they're never stored directly, only
   derived from rank order.

## Data

`data/cities.json` is a static, pre-processed extract of the GeoNames
`cities15000` dataset (CC BY 4.0) — name, country, admin region, coordinates,
and population for ~1,500 of the world's largest cities. It's bundled with
the app and never fetched at runtime.

## Backup

Your data lives only in this browser's IndexedDB. Use the settings sheet
(gear icon) to export a JSON backup or import one — this is the only way to
move data between browsers or devices.
<!-- doc pass 1 -->
<!-- doc pass 2 -->
<!-- doc pass 3 -->
<!-- doc pass 4 -->
<!-- doc pass 5 -->
<!-- doc pass 6 -->
<!-- doc pass 7 -->
<!-- doc pass 8 -->
<!-- doc pass 9 -->
<!-- doc pass 10 -->
<!-- doc pass 11 -->
<!-- doc pass 12 -->
