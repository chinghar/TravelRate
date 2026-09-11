import type { Bucket } from '@/lib/types';

const BAND_TEXT_CLASS: Record<Bucket, string> = {
  loved: 'text-signal',
  fine: 'text-signal-dim',
  didnt: 'text-ink',
};

const SIZE_CLASS = {
  md: 'text-lg',
  lg: 'text-5xl',
} as const;

export default function ScoreBadge({
  score,
  bucket,
  size = 'md',
}: {
  score: number;
  bucket: Bucket;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      className={`font-mono font-bold tabular-nums ${SIZE_CLASS[size]} ${BAND_TEXT_CLASS[bucket]}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

const BAND_CSS_VAR: Record<Bucket, string> = {
  loved: '--signal',
  fine: '--signal-dim',
  didnt: '--mute',
};

/**
 * Resolves a bucket to its actual color, read from the CSS custom
 * properties in globals.css, for contexts that need a real value rather
 * than a Tailwind class (Leaflet's SVG renderer sets path colors as
 * attributes, which can't reference `var(--…)`).
 */
export function getBandColorValue(bucket: Bucket): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(BAND_CSS_VAR[bucket])
    .trim();
}
