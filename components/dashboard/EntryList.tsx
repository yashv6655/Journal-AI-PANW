import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Entry {
  _id: string;
  content: string;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    emotions: string[];
  };
  metadata: {
    wordCount: number;
  };
  createdAt: string;
}

interface EntryListProps {
  entries: Entry[];
}

export function EntryList({ entries }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
          <p className="text-muted-foreground mb-6">
            Start your journaling journey by writing your first entry
          </p>
          <Link href="/entries/new">
            <span className="inline-flex items-center gap-2 text-[hsl(var(--color-primary))] font-semibold hover:underline">
              Create your first entry
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getSentimentVariant = (overall: string) => {
    if (overall === 'positive') return 'positive';
    if (overall === 'negative') return 'negative';
    return 'neutral';
  };

  const getSentimentEmoji = (overall: string) => {
    if (overall === 'positive') return '😊';
    if (overall === 'negative') return '😔';
    return '😐';
  };

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const preview = entry.content.substring(0, 150);
        const truncated = entry.content.length > 150;

        return (
          <Link key={entry._id} href={`/entries/${entry._id}`}>
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant={getSentimentVariant(entry.sentiment.overall)}>
                        {getSentimentEmoji(entry.sentiment.overall)} {entry.sentiment.overall}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        • {entry.metadata.wordCount} words
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed">
                      {preview}
                      {truncated && '...'}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
