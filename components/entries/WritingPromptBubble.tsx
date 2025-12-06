'use client';

import { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SentimentResult } from '@/types';

interface WritingPromptBubbleProps {
  type: 'completion' | 'question';
  message?: string; // For completion
  question?: string; // For questions
  sentiment?: SentimentResult;
  onDismiss: () => void;
}

export function WritingPromptBubble({
  type,
  message,
  question,
  sentiment,
  onDismiss,
}: WritingPromptBubbleProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 200); // Allow fade-out animation
  };

  const getSentimentEmoji = () => {
    if (!sentiment) return '💭';
    if (sentiment.overall === 'positive') return '😊';
    if (sentiment.overall === 'negative') return '😔';
    return '😐';
  };

  const getSentimentVariant = () => {
    if (!sentiment) return 'default';
    if (sentiment.overall === 'positive') return 'positive';
    if (sentiment.overall === 'negative') return 'negative';
    return 'neutral';
  };

  if (!isVisible) return null;

  const isCompletion = type === 'completion';
  const displayText = isCompletion ? message : question;

  return (
    <div
      className={`absolute left-full top-4 ml-4 z-10 w-72 animate-in slide-in-from-left-5 fade-in-0 duration-300 ${
        !isVisible ? 'animate-out slide-out-to-left-5 fade-out-0' : ''
      }`}
      style={{ maxHeight: '400px' }}
    >
      <div
        className={`relative rounded-2xl p-4 shadow-lg ${
          isCompletion
            ? 'bg-[hsl(var(--color-positive))]/10 border-2 border-[hsl(var(--color-positive))]/30'
            : 'bg-card border-2 border-[hsl(var(--color-primary))]/30'
        }`}
      >
        {/* Thought bubble tail pointing to textarea */}
        <div
          className={`absolute -left-2 top-5 w-4 h-4 rotate-45 ${
            isCompletion
              ? 'bg-[hsl(var(--color-positive))]/10 border-l-2 border-b-2 border-[hsl(var(--color-positive))]/30'
              : 'bg-card border-l-2 border-b-2 border-[hsl(var(--color-primary))]/30'
          }`}
        ></div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity p-1 hover:bg-[hsl(var(--color-muted))]"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Content */}
        <div className="space-y-3 pr-6">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isCompletion
                  ? 'bg-[hsl(var(--color-positive))]/20'
                  : 'bg-[hsl(var(--color-primary))]/10'
              }`}
            >
              {isCompletion ? (
                <CheckCircle2 className={`w-3.5 h-3.5 text-[hsl(var(--color-positive))]`} />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--color-primary))]" />
              )}
            </div>
            {!isCompletion && sentiment && (
              <Badge variant={getSentimentVariant()} className="text-xs px-2 py-0.5">
                {getSentimentEmoji()}
              </Badge>
            )}
          </div>
          
          <p
            className={`text-sm leading-relaxed font-medium ${
              isCompletion
                ? 'text-[hsl(var(--color-positive))]'
                : 'text-foreground'
            }`}
          >
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}
