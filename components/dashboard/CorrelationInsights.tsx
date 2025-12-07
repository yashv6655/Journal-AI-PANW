'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, Loader2 } from 'lucide-react';

interface CorrelationInsight {
  correlation: string;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  examples: string[];
}

export function CorrelationInsights() {
  const [correlations, setCorrelations] = useState<CorrelationInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrelations();
  }, []);

  const fetchCorrelations = async () => {
    try {
      const res = await fetch('/api/correlations?limit=50');
      if (!res.ok) throw new Error('Failed to fetch correlations');
      const data = await res.json();
      
      setCorrelations(data.correlations || []);
    } catch (error) {
      console.error('Error fetching correlations:', error);
      setCorrelations([]);
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

  if (correlations.length === 0) {
    return null; // Don't show if no correlations found
  }

  const getStrengthVariant = (strength: string) => {
    if (strength === 'strong') return 'positive';
    if (strength === 'moderate') return 'default';
    return 'outline';
  };

  const getStrengthLabel = (strength: string) => {
    if (strength === 'strong') return 'Strong Pattern';
    if (strength === 'moderate') return 'Moderate Pattern';
    return 'Weak Pattern';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--color-secondary))]/10">
            <Link2 className="w-5 h-5 text-[hsl(var(--color-secondary))]" />
          </div>
          <CardTitle className="text-2xl">Pattern Connections</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Discovered relationships between your activities and emotions
        </p>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {correlations.map((correlation, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-[hsl(var(--color-muted))]/50 border border-border"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-foreground flex-1">{correlation.correlation}</p>
                <Badge variant={getStrengthVariant(correlation.strength)} className="text-xs ml-2">
                  {getStrengthLabel(correlation.strength)}
                </Badge>
              </div>
              {correlation.description && (
                <p className="text-sm text-muted-foreground mb-2">{correlation.description}</p>
              )}
              {correlation.examples && correlation.examples.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Examples:</p>
                  <ul className="space-y-1">
                    {correlation.examples.map((example, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {example}
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
