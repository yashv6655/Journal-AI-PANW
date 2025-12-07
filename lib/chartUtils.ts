/**
 * Utility functions for chart formatting and mood analysis
 */

export interface MoodZone {
  label: string;
  emoji: string;
  color: string;
  range: [number, number];
}

export const MOOD_ZONES: MoodZone[] = [
  {
    label: 'Very Negative',
    emoji: '😔',
    color: 'hsl(var(--color-negative))',
    range: [0, 0.3],
  },
  {
    label: 'Negative',
    emoji: '😟',
    color: 'hsl(var(--color-negative))',
    range: [0.3, 0.4],
  },
  {
    label: 'Neutral',
    emoji: '😐',
    color: 'rgb(156, 163, 175)', // gray-400 for visibility
    range: [0.4, 0.7],
  },
  {
    label: 'Positive',
    emoji: '🙂',
    color: 'hsl(var(--color-positive))',
    range: [0.7, 0.85],
  },
  {
    label: 'Very Positive',
    emoji: '😊',
    color: 'hsl(var(--color-positive))',
    range: [0.85, 1.0],
  },
];

/**
 * Get mood zone for a given score
 */
export function getMoodZone(score: number | null): MoodZone | null {
  if (score === null || score < 0 || score > 1) return null;
  
  for (const zone of MOOD_ZONES) {
    if (score >= zone.range[0] && score < zone.range[1]) {
      return zone;
    }
  }
  
  // Handle edge case for score === 1.0
  if (score === 1.0) {
    return MOOD_ZONES[MOOD_ZONES.length - 1];
  }
  
  return MOOD_ZONES[2]; // Default to neutral
}

/**
 * Get emoji for a given score
 */
export function getMoodEmoji(score: number | null): string {
  const zone = getMoodZone(score);
  return zone?.emoji || '😐';
}

/**
 * Get mood label for a given score
 */
export function getMoodLabel(score: number | null): string {
  const zone = getMoodZone(score);
  return zone?.label || 'Unknown';
}

/**
 * Format score as percentage
 */
export function formatScore(score: number | null): string {
  if (score === null) return 'N/A';
  return `${(score * 100).toFixed(0)}%`;
}

/**
 * Calculate trend (improving, stable, declining)
 */
export function calculateTrend(scores: (number | null)[]): {
  direction: 'improving' | 'stable' | 'declining';
  percentage: number;
} {
  const validScores = scores.filter((s): s is number => s !== null);
  if (validScores.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  // Compare first half vs second half
  const midpoint = Math.floor(validScores.length / 2);
  const firstHalf = validScores.slice(0, midpoint);
  const secondHalf = validScores.slice(midpoint);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;
  const percentage = Math.abs(change * 100);

  if (change > 0.05) {
    return { direction: 'improving', percentage };
  } else if (change < -0.05) {
    return { direction: 'declining', percentage };
  } else {
    return { direction: 'stable', percentage };
  }
}

/**
 * Get most common mood category
 */
export function getMostCommonMood(scores: (number | null)[]): {
  mood: 'positive' | 'neutral' | 'negative';
  count: number;
  percentage: number;
} {
  const validScores = scores.filter((s): s is number => s !== null);
  if (validScores.length === 0) {
    return { mood: 'neutral', count: 0, percentage: 0 };
  }

  let positive = 0;
  let neutral = 0;
  let negative = 0;

  validScores.forEach((score) => {
    if (score >= 0.7) {
      positive++;
    } else if (score >= 0.4) {
      neutral++;
    } else {
      negative++;
    }
  });

  const total = validScores.length;
  const counts = [
    { mood: 'positive' as const, count: positive, percentage: (positive / total) * 100 },
    { mood: 'neutral' as const, count: neutral, percentage: (neutral / total) * 100 },
    { mood: 'negative' as const, count: negative, percentage: (negative / total) * 100 },
  ];

  return counts.reduce((max, current) => 
    current.count > max.count ? current : max
  );
}

/**
 * Format date for tooltip
 */
export function formatTooltipDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
