import CityDetailClient from '@/components/CityDetailClient';

export default async function CityDetailPage({
  params,
}: PageProps<'/city/[id]'>) {
  const { id } = await params;
  return <CityDetailClient cityId={id} />;
}
