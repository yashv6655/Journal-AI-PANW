import { Badge } from '@/components/ui/badge';

interface SentimentBadgeProps {
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    emotions: string[];
  };
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const getEmoji = () => {
    if (sentiment.overall === 'positive') return '😊';
    if (sentiment.overall === 'negative') return '😔';
    return '😐';
  };

  const getVariant = () => {
    if (sentiment.overall === 'positive') return 'positive';
    if (sentiment.overall === 'negative') return 'negative';
    return 'neutral';
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant={getVariant()} className="text-base px-4 py-2">
        {getEmoji()} {sentiment.overall.charAt(0).toUpperCase() + sentiment.overall.slice(1)}
      </Badge>
      {sentiment.emotions && sentiment.emotions.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Emotions: {sentiment.emotions.slice(0, 3).join(', ')}
        </div>
      )}
    </div>
  );
}
