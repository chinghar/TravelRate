import citiesData from '@/data/cities.json';
import type { City } from './types';

const cities = citiesData as City[];

const cityById = new Map<string, City>(cities.map((c) => [c.id, c]));

export function getCityById(id: string): City | undefined {
  return cityById.get(id);
}

export function getAllCities(): City[] {
  return cities;
}

/** Client-side substring search, population-weighted ordering. */
export function searchCities(query: string, limit = 30): City[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return cities.slice().sort((a, b) => b.population - a.population).slice(0, limit);
  }
  const matches = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.admin.toLowerCase().includes(q)
  );
  matches.sort((a, b) => b.population - a.population);
  return matches.slice(0, limit);
}
