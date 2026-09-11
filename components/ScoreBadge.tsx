import { getScoreBand } from '@/lib/ranking';

const BAND_STYLES = {
  loved: 'bg-emerald-100 text-emerald-800',
  fine: 'bg-amber-100 text-amber-800',
  didnt: 'bg-rose-100 text-rose-800',
} as const;

export default function ScoreBadge({ score }: { score: number }) {
  const band = getScoreBand(score);
  return (
    <span
      className={`inline-flex min-w-[3rem] items-center justify-center rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${BAND_STYLES[band]}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

export const SCORE_BAND_COLORS: Record<'loved' | 'fine' | 'didnt', string> = {
  loved: '#059669',
  fine: '#d97706',
  didnt: '#e11d48',
};
