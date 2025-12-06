'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import type { PromptResponse } from '@/types';

export function PromptCard() {
  const [promptData, setPromptData] = useState<PromptResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrompt = () => {
    fetch('/api/prompts', {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((data) => {
        setPromptData(data);
        setLoading(false);
      })
      .catch(() => {
        setPromptData({
          prompt: 'What are you grateful for today?',
          answered: false,
          canAnswer: true,
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPrompt();
    
    // Refresh prompt when page becomes visible (user returns from entry editor)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPrompt();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatTimeUntil = (cooldownUntil: Date) => {
    const now = new Date();
    const until = new Date(cooldownUntil);
    const diffMs = until.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!promptData) {
    return null;
  }

  const { prompt, answered, cooldownUntil, canAnswer } = promptData;

  return (
    <Card className="bg-gradient-to-br from-[hsl(var(--color-primary))]/5 via-[hsl(var(--color-secondary))]/5 to-transparent border-2 border-[hsl(var(--color-primary))]/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[hsl(var(--color-primary))]/10">
            <Sparkles className="w-5 h-5 text-[hsl(var(--color-primary))]" />
          </div>
          <CardTitle className="text-xl">Today's Reflection Prompt</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-6 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
            <div className="h-4 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-3/4" />
          </div>
        ) : (
          <>
            <p className="text-lg text-foreground mb-4 leading-relaxed">
              {prompt}
            </p>
            
            {answered && cooldownUntil && !canAnswer && (
              <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--color-muted))]/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    You&apos;ve answered today&apos;s prompt. New prompt available in{' '}
                    <strong className="text-foreground">
                      {formatTimeUntil(new Date(cooldownUntil))}
                    </strong>
                    .
                  </span>
                </div>
              </div>
            )}

            <Link href="/entries/new">
              <Button 
                className="w-full sm:w-auto" 
                size="lg"
                variant={answered && !canAnswer ? 'outline' : 'default'}
              >
                {answered && !canAnswer ? 'Write Free-Form Entry' : 'Start Writing'}
                <span className="ml-2">→</span>
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
