'use client';

import dynamic from 'next/dynamic';

const CityMap = dynamic(() => import('@/components/CityMap'), { ssr: false });

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium text-mute">Map</h1>
      <CityMap />
    </div>
  );
}
