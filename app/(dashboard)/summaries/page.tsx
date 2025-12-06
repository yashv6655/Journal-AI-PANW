'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Sparkles, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Summary {
  _id: string;
  type: 'weekly' | 'monthly';
  period: {
    start: string;
    end: string;
  };
  content: string;
  insights: string[];
  entriesAnalyzed: number;
  createdAt: string;
}

export default function SummariesPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const res = await fetch('/api/summaries');
      if (!res.ok) throw new Error('Failed to fetch summaries');
      const data = await res.json();
      // Convert MongoDB dates to strings
      const formattedSummaries = (data.summaries || []).map((summary: any) => ({
        ...summary,
        period: {
          start: summary.period?.start ? new Date(summary.period.start).toISOString() : '',
          end: summary.period?.end ? new Date(summary.period.end).toISOString() : '',
        },
        createdAt: summary.createdAt ? new Date(summary.createdAt).toISOString() : '',
      }));
      setSummaries(formattedSummaries);
    } catch (error) {
      console.error('Error fetching summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      // Calculate last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const res = await fetch('/api/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to generate summary');

      // Refresh summaries list
      await fetchSummaries();
      router.refresh();
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-64" />
        <Card>
          <CardContent className="p-8">
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Weekly Summaries</h1>
          <p className="text-xl text-muted-foreground">
            AI-generated insights from your journaling journey
          </p>
        </div>
        <Button
          onClick={handleGenerateSummary}
          disabled={generating}
          className="flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate New Summary
            </>
          )}
        </Button>
      </div>

      {/* Generate Summary Info */}
      {summaries.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No summaries yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first weekly summary to see AI-powered insights from your entries
            </p>
            <Button onClick={handleGenerateSummary} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summaries List */}
      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card key={summary._id} className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {summary.type === 'weekly' ? 'Weekly' : 'Monthly'} Summary
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(summary.period.start)} - {formatDate(summary.period.end)}
                    </span>
                    <span>•</span>
                    <span>{summary.entriesAnalyzed} entries analyzed</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  {summary.content}
                </p>
              </div>

              {/* Insights */}
              {summary.insights && summary.insights.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3 text-foreground">Key Insights</h4>
                  <ul className="space-y-2">
                    {summary.insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground">
                        <span className="text-[hsl(var(--color-primary))] mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <p>Generated: {formatDate(summary.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
