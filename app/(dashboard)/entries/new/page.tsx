'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SentimentBadge } from '@/components/entries/SentimentBadge';
import { WritingPromptBubble } from '@/components/entries/WritingPromptBubble';
import { ArrowLeft, Save, Loader2, X, Clock, Mic, Keyboard } from 'lucide-react';
import type { SentimentResult, PromptResponse, WritingPromptResponse } from '@/types';
import { VoiceJournal } from '@/components/entries/VoiceJournal';

// Configuration constants
const WORD_THRESHOLD = 20; // Show prompt every 20 words
const MIN_WORDS_FOR_PROMPT = 15; // Minimum words before showing prompts

export default function NewEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptData, setPromptData] = useState<PromptResponse | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<any>(null);
  const [entryMode, setEntryMode] = useState<'text' | 'voice'>('text');
  
  // Writing prompt states
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<'completion' | 'question'>('question');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentSentiment, setCurrentSentiment] = useState<SentimentResult | undefined>();
  const [lastPromptWordCount, setLastPromptWordCount] = useState(0);
  const [lastCompletionCheckWordCount, setLastCompletionCheckWordCount] = useState(0);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if prompt is provided in URL (from PromptsTab)
    const urlPrompt = searchParams.get('prompt');
    if (urlPrompt) {
      setPrompt(decodeURIComponent(urlPrompt));
      setPromptData({
        prompt: decodeURIComponent(urlPrompt),
        answered: false,
        canAnswer: true,
      });
      setLoading(false);
    } else {
      // Fetch daily prompt (same as dashboard)
      fetch('/api/prompts', { method: 'POST' })
        .then((res) => res.json())
        .then((data: PromptResponse) => {
          setPromptData(data);
          setPrompt(data.prompt || 'What are you grateful for today?');
          setLoading(false);
        })
        .catch(() => {
          const fallback: PromptResponse = {
            prompt: 'What are you grateful for today?',
            answered: false,
            canAnswer: true,
          };
          setPromptData(fallback);
          setPrompt(fallback.prompt);
          setLoading(false);
        });
    }
  }, [searchParams]);

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

  // Function to generate writing prompt
  const generateWritingPrompt = useCallback(async (currentContent: string, type: 'follow-up' | 'completion-check' = 'follow-up') => {
    if (isGeneratingPrompt) return; // Prevent duplicate calls
    
    setIsGeneratingPrompt(true);
    try {
      const res = await fetch('/api/writing-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent, type }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate prompt');
      }

      const data: WritingPromptResponse = await res.json();
      
      if (data.type === 'completion') {
        setPromptType('completion');
        setCurrentMessage(data.message || 'Your entry looks well-rounded and complete. Ready to save!');
        setCurrentSentiment(data.sentiment);
        setShowPrompt(true);
      } else if (data.type === 'question') {
        setPromptType('question');
        setCurrentQuestion(data.question || '');
        setCurrentSentiment(data.sentiment);
        setShowPrompt(true);
      }
      // If type is null, don't show anything
    } catch (error) {
      console.error('Error generating writing prompt:', error);
      // Silently fail - don't interrupt user's writing
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [isGeneratingPrompt]);

  // Function to check completion status
  const checkCompletion = useCallback(async (currentContent: string) => {
    const wordCount = currentContent.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount >= 50 && wordCount >= lastCompletionCheckWordCount + 30) {
      await generateWritingPrompt(currentContent, 'completion-check');
      setLastCompletionCheckWordCount(wordCount);
    }
  }, [generateWritingPrompt, lastCompletionCheckWordCount]);

  // Check word count thresholds for regular prompts
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // Only check if content is meaningful and above minimum threshold
    if (wordCount < MIN_WORDS_FOR_PROMPT) {
      return;
    }

    // Check if we've crossed a new threshold
    const currentThreshold = Math.floor(wordCount / WORD_THRESHOLD) * WORD_THRESHOLD;
    const lastThreshold = Math.floor(lastPromptWordCount / WORD_THRESHOLD) * WORD_THRESHOLD;

    // Only trigger if we've crossed a new threshold
    // Don't show regular prompts if a prompt is already showing (to avoid spamming)
    // Don't show regular prompts if completion message is showing (completion takes priority)
    if (currentThreshold > lastThreshold && !saving && !showPrompt && promptType !== 'completion') {
      // Debounce to avoid triggering while user is actively typing
      debounceTimerRef.current = setTimeout(() => {
        // Re-check word count after debounce (in case user deleted content)
        const updatedWordCount = content.trim().split(/\s+/).filter(Boolean).length;
        const updatedThreshold = Math.floor(updatedWordCount / WORD_THRESHOLD) * WORD_THRESHOLD;
        
        if (updatedThreshold > lastThreshold && updatedWordCount >= MIN_WORDS_FOR_PROMPT && !showPrompt && promptType !== 'completion') {
          generateWritingPrompt(content, 'follow-up');
          setLastPromptWordCount(updatedWordCount);
        }
      }, 1000); // 1 second debounce
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, lastPromptWordCount, showPrompt, saving, generateWritingPrompt, promptType]);

  // Check completion status at 50 words and every 30 words thereafter
  useEffect(() => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    
    if (wordCount >= 50 && wordCount >= lastCompletionCheckWordCount + 30 && !saving && !isGeneratingPrompt) {
      // Debounce completion check
      const timer = setTimeout(() => {
        checkCompletion(content);
      }, 1500); // Slightly longer debounce for completion checks
      
      return () => clearTimeout(timer);
    }
  }, [content, lastCompletionCheckWordCount, saving, isGeneratingPrompt, checkCompletion]);

  // Inactivity detection - show follow-up question after 5 seconds of no typing
  useEffect(() => {
    // Clear existing inactivity timer (this restarts the timer on every content change)
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Don't start timer if a prompt is already showing (to avoid spamming)
    if (showPrompt) {
      return;
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // Only trigger if word count >= 15
    // Don't show questions if completion is already showing
    if (wordCount >= 15 && !saving && promptType !== 'completion') {
      // Start 5-second timer - will be reset if user types again
      inactivityTimerRef.current = setTimeout(() => {
        // Re-check conditions after timeout
        const updatedWordCount = content.trim().split(/\s+/).filter(Boolean).length;
        if (updatedWordCount >= 15 && !saving && !isGeneratingPrompt && promptType !== 'completion') {
          generateWritingPrompt(content, 'follow-up');
        }
      }, 5000); // 5 seconds of inactivity
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [content, saving, isGeneratingPrompt, generateWritingPrompt, promptType, showPrompt]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag) && newTag.length > 0) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, prompt, tags }),
      });

      if (!res.ok) throw new Error('Failed to save entry');

      const data = await res.json();
      setSavedEntry(data);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (error) {
      alert('Failed to save entry. Please try again.');
      setSaving(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  if (savedEntry) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border-2 border-[hsl(var(--color-positive))]/20 bg-[hsl(var(--color-positive))]/5">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-3xl font-bold mb-4">Entry saved!</h2>
            <p className="text-muted-foreground mb-6">
              Your thoughts have been recorded and analyzed
            </p>
            {savedEntry.sentiment && (
              <div className="mb-6 flex justify-center">
                <SentimentBadge sentiment={savedEntry.sentiment} />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Entry</h1>
            <p className="text-muted-foreground">Write your thoughts freely</p>
          </div>
        </div>

        {/* Prompt Card */}
        {prompt && (
          <Card className="bg-gradient-to-br from-[hsl(var(--color-primary))]/5 to-[hsl(var(--color-secondary))]/5 border-2 border-[hsl(var(--color-primary))]/20">
            <CardHeader>
              <CardTitle className="text-lg">Today's Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed mb-4">{prompt}</p>
              
              {promptData?.answered && promptData?.cooldownUntil && !promptData?.canAnswer && (
                <div className="p-3 rounded-lg bg-[hsl(var(--color-muted))]/50 border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      You&apos;ve answered today&apos;s prompt. New prompt available in{' '}
                      <strong className="text-foreground">
                        {formatTimeUntil(new Date(promptData.cooldownUntil))}
                      </strong>
                      . You can still write a free-form entry below.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Entry Mode Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Entry Mode:</span>
              <div className="flex gap-2">
                <Button
                  variant={entryMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryMode('text')}
                  disabled={saving}
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant={entryMode === 'voice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntryMode('voice')}
                  disabled={saving}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Voice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor - Text Mode */}
        {entryMode === 'text' && (
          <Card>
            <CardContent className="p-6">
              <div className="relative flex gap-4">
                <div className="flex-1">
                  <Textarea
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      // If completion message is showing and user continues typing, hide it
                      if (showPrompt && promptType === 'completion') {
                        setShowPrompt(false);
                      }
                    }}
                    placeholder="Start writing your thoughts here... Don't worry about perfection, just let your thoughts flow."
                    className="min-h-[400px] text-base leading-relaxed"
                    disabled={saving}
                  />
                </div>
                {/* Writing Prompt Bubble */}
                {showPrompt && (promptType === 'completion' ? currentMessage : currentQuestion) && (
                  <WritingPromptBubble
                    type={promptType}
                    message={promptType === 'completion' ? currentMessage : undefined}
                    question={promptType === 'question' ? currentQuestion : undefined}
                    sentiment={currentSentiment}
                    onDismiss={() => {
                      setShowPrompt(false);
                      // If completion was dismissed and user continues typing, reset completion check
                      if (promptType === 'completion') {
                        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                        setLastCompletionCheckWordCount(wordCount);
                      }
                    }}
                  />
                )}
              </div>
              {/* Tags Input */}
              <div className="mt-4 space-y-2">
                <label htmlFor="tags" className="text-sm font-medium text-foreground">
                  Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-[hsl(var(--color-error))]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    id="tags"
                    type="text"
                    placeholder="Add tag (press Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-auto min-w-[150px] flex-1 max-w-[200px]"
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter to add a tag. Tags help organize your entries.
                </p>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </p>
                <div className="flex gap-3">
                  <Link href="/dashboard">
                    <Button variant="outline" disabled={saving}>
                      Cancel
                    </Button>
                  </Link>
                  <Button onClick={handleSave} disabled={!content.trim() || saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Entry
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Mode */}
        {entryMode === 'voice' && prompt && (
          <VoiceJournal
            dailyPrompt={prompt}
            onEntryCreated={(entry) => {
              setSavedEntry(entry);
              // Redirect to dashboard after 2 seconds (same as text entry)
              setTimeout(() => {
                router.push('/dashboard');
                router.refresh();
              }, 2000);
            }}
            onError={(error) => {
              alert(error);
            }}
          />
        )}

        {/* Cancel button for voice mode */}
        {entryMode === 'voice' && (
          <div className="flex justify-end">
            <Link href="/dashboard">
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
          </div>
        )}
      </div>

    </>
  );
}
