'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Lightbulb, Loader2 } from 'lucide-react';

interface ThemeInsight {
  theme: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  examples: string[];
  description: string;
}

export function ThemeInsights() {
  const [insights, setInsights] = useState<ThemeInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemeInsights();
  }, []);

  const fetchThemeInsights = async () => {
    try {
      const res = await fetch('/api/themes?limit=50');
      if (!res.ok) throw new Error('Failed to fetch themes');
      const data = await res.json();
      
      setInsights(data.themes || []);
    } catch (error) {
      console.error('Error fetching theme insights:', error);
      // Fallback to empty array on error
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return null; // Don't show if no themes detected
  }

  const getSentimentVariant = (sentiment: string) => {
    if (sentiment === 'positive') return 'positive';
    if (sentiment === 'negative') return 'negative';
    return 'default';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--color-secondary))]/10">
            <Lightbulb className="w-5 h-5 text-[hsl(var(--color-secondary))]" />
          </div>
          <CardTitle className="text-2xl">Recurring Themes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Topics you've written about frequently in your recent entries
        </p>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-[hsl(var(--color-muted))]/50 border border-border"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{insight.theme}</span>
                  <Badge variant={getSentimentVariant(insight.sentiment)} className="text-xs">
                    {insight.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{insight.frequency} mentions</span>
                </div>
              </div>
              {insight.description && (
                <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
              )}
              {insight.examples && insight.examples.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Examples:</p>
                  <ul className="space-y-1">
                    {insight.examples.slice(0, 2).map((example, i) => (
                      <li key={i} className="text-xs text-muted-foreground italic">
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
