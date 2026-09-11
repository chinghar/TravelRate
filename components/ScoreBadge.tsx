import { getScoreBand } from '@/lib/ranking';

const BAND_TEXT_CLASS = {
  loved: 'text-signal',
  fine: 'text-signal-dim',
  didnt: 'text-ink',
} as const;

const SIZE_CLASS = {
  md: 'text-lg',
  lg: 'text-5xl',
} as const;

export default function ScoreBadge({
  score,
  size = 'md',
}: {
  score: number;
  size?: 'md' | 'lg';
}) {
  const band = getScoreBand(score);
  return (
    <span
      className={`font-mono font-bold tabular-nums ${SIZE_CLASS[size]} ${BAND_TEXT_CLASS[band]}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

const BAND_CSS_VAR = {
  loved: '--signal',
  fine: '--signal-dim',
  didnt: '--mute',
} as const;

/**
 * Resolves a band to its actual color, read from the CSS custom properties
 * in globals.css, for contexts that need a real value rather than a
 * Tailwind class (Leaflet's SVG renderer sets path colors as attributes,
 * which can't reference `var(--…)`).
 */
export function getScoreBandColorValue(score: number): string {
  const band = getScoreBand(score);
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(BAND_CSS_VAR[band])
    .trim();
}
