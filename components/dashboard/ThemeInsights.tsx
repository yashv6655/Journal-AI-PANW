'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Lightbulb } from 'lucide-react';

interface ThemeInsight {
  theme: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  recentMentions: number;
}

export function ThemeInsights() {
  const [insights, setInsights] = useState<ThemeInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemeInsights();
  }, []);

  const fetchThemeInsights = async () => {
    try {
      const res = await fetch('/api/entries?limit=50');
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data = await res.json();
      
      // Analyze entries for recurring themes
      const themeMap: { [key: string]: { count: number; sentiments: string[] } } = {};
      
      // Common theme keywords
      const themeKeywords: { [key: string]: string[] } = {
        'Work': ['work', 'job', 'career', 'office', 'colleague', 'boss', 'meeting', 'project'],
        'Relationships': ['friend', 'family', 'relationship', 'partner', 'love', 'dating', 'parent'],
        'Health': ['health', 'exercise', 'workout', 'fitness', 'diet', 'sleep', 'doctor', 'pain'],
        'Stress': ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure', 'tension'],
        'Gratitude': ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky'],
        'Goals': ['goal', 'plan', 'achieve', 'progress', 'future', 'dream'],
        'Creativity': ['creative', 'art', 'music', 'write', 'design', 'project'],
        'Travel': ['travel', 'trip', 'vacation', 'journey', 'adventure'],
      };

      data.entries?.forEach((entry: any) => {
        const content = entry.content.toLowerCase();
        const sentiment = entry.sentiment?.overall || 'neutral';
        
        Object.entries(themeKeywords).forEach(([theme, keywords]) => {
          const matches = keywords.filter(keyword => content.includes(keyword));
          if (matches.length > 0) {
            if (!themeMap[theme]) {
              themeMap[theme] = { count: 0, sentiments: [] };
            }
            themeMap[theme].count += 1;
            themeMap[theme].sentiments.push(sentiment);
          }
        });
      });

      // Convert to insights array and calculate sentiment
      const themeInsights: ThemeInsight[] = Object.entries(themeMap)
        .map(([theme, data]) => {
          const positiveCount = data.sentiments.filter(s => s === 'positive').length;
          const negativeCount = data.sentiments.filter(s => s === 'negative').length;
          const overallSentiment = positiveCount > negativeCount ? 'positive' : 
                                  negativeCount > positiveCount ? 'negative' : 'neutral';
          
          return {
            theme,
            frequency: data.count,
            sentiment: overallSentiment,
            recentMentions: data.count, // In last 50 entries
          };
        })
        .filter(insight => insight.frequency >= 2) // Only show themes mentioned 2+ times
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5); // Top 5 themes

      setInsights(themeInsights);
    } catch (error) {
      console.error('Error fetching theme insights:', error);
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
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--color-muted))]/50 border border-border"
            >
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
