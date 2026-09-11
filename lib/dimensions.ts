export type DimensionId =
  | 'overall'
  | 'food'
  | 'nightlife'
  | 'nature'
  | 'walkability'
  | 'architecture'
  | 'value';

export interface Dimension {
  id: DimensionId;
  label: string;
  /** Shown as the comparison screen's heading for this dimension. */
  question: string;
  /** "How was {city}?" / "How was the food in {city}?" — this dimension's bucket-step heading. */
  bucketPrompt: (cityName: string) => string;
  /** Shown on the home list when nothing is ranked on this dimension yet. */
  emptyState: string;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: 'overall',
    label: 'Overall',
    question: 'Which city did you prefer?',
    bucketPrompt: (city) => `How was ${city}?`,
    emptyState: "You haven't ranked a city yet.",
  },
  {
    id: 'food',
    label: 'Food',
    question: 'Which city had better food?',
    bucketPrompt: (city) => `How was the food in ${city}?`,
    emptyState: "You haven't ranked a city on food yet.",
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    question: 'Which city had better nightlife?',
    bucketPrompt: (city) => `How was the nightlife in ${city}?`,
    emptyState: "You haven't ranked a city on nightlife yet.",
  },
  {
    id: 'nature',
    label: 'Nature',
    question: 'Which city had better access to nature?',
    bucketPrompt: (city) => `How was the nature in ${city}?`,
    emptyState: "You haven't ranked a city on nature yet.",
  },
  {
    id: 'walkability',
    label: 'Walkability',
    question: 'Which city was easier to get around on foot?',
    bucketPrompt: (city) => `How was the walkability in ${city}?`,
    emptyState: "You haven't ranked a city on walkability yet.",
  },
  {
    id: 'architecture',
    label: 'Architecture',
    question: 'Which city had better architecture?',
    bucketPrompt: (city) => `How was the architecture in ${city}?`,
    emptyState: "You haven't ranked a city on architecture yet.",
  },
  {
    id: 'value',
    label: 'Value',
    question: 'Which city gave you more for your money?',
    bucketPrompt: (city) => `How was the value in ${city}?`,
    emptyState: "You haven't ranked a city on value yet.",
  },
];

export const OVERALL_DIMENSION_ID: DimensionId = 'overall';

/** All dimensions other than overall — the add flow's optional chip row. */
export const SECONDARY_DIMENSIONS: Dimension[] = DIMENSIONS.filter(
  (d) => d.id !== OVERALL_DIMENSION_ID
);

const dimensionById = new Map(DIMENSIONS.map((d) => [d.id, d]));

export function getDimension(id: DimensionId): Dimension {
  const dimension = dimensionById.get(id);
  if (!dimension) throw new Error(`Unknown dimension: ${id}`);
  return dimension;
}
