'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import type { SentimentResult } from '@/types';

interface WritingPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  sentiment?: SentimentResult;
}

export function WritingPromptDialog({
  open,
  onOpenChange,
  question,
  sentiment,
}: WritingPromptDialogProps) {
  const [answer, setAnswer] = useState('');

  const handleContinue = () => {
    setAnswer(''); // Clear answer (not saved)
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[hsl(var(--color-primary))]/10">
              <Sparkles className="w-5 h-5 text-[hsl(var(--color-primary))]" />
            </div>
            <DialogTitle>Reflection Prompt</DialogTitle>
          </div>
          {sentiment && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getSentimentVariant()} className="text-xs">
                {getSentimentEmoji()} {sentiment.overall}
              </Badge>
            </div>
          )}
          <DialogDescription className="text-base leading-relaxed pt-2">
            {question}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="reflection-answer" className="text-sm font-medium text-muted-foreground">
              Your thoughts (optional - not saved)
            </label>
            <Textarea
              id="reflection-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Take a moment to reflect on this question..."
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleContinue}>
            Continue Writing
          </Button>
          <Button onClick={handleContinue}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
