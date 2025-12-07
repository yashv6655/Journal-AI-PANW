'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SentimentBadge } from '@/components/entries/SentimentBadge';
import { ArrowLeft, Calendar, FileText, Loader2, Trash2, Mic, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface Entry {
  _id: string;
  content: string;
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    emotions: string[];
    confidence: number;
  };
  metadata: {
    wordCount: number;
    prompt?: string;
    timeOfDay: string;
    entryType?: 'text' | 'voice';
    fullTranscript?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export default function EntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = (params?.id || '') as string;
  
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);

  useEffect(() => {
    fetchEntry();
  }, [entryId]);

  const fetchEntry = async () => {
    try {
      const res = await fetch(`/api/entries/${entryId}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/entries');
          return;
        }
        throw new Error('Failed to fetch entry');
      }
      const data = await res.json();
      setEntry(data.entry);
    } catch (error) {
      console.error('Error fetching entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete entry');

      router.push('/entries');
      router.refresh();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-64" />
        <Card>
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="h-6 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
              <div className="h-4 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-3/4" />
              <div className="h-32 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Entry not found</h3>
            <p className="text-muted-foreground mb-6">
              This entry may have been deleted or doesn't exist.
            </p>
            <Link href="/entries">
              <Button>Back to Entries</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Entry Details</h1>
            <p className="text-muted-foreground">View your journal entry</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </>
          )}
        </Button>
      </div>

      {/* Entry Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Your Entry</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {formatDate(entry.createdAt)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sentiment Analysis */}
          {entry.sentiment && (
            <div className="p-4 bg-[hsl(var(--color-muted))]/50 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <SentimentBadge sentiment={entry.sentiment} />
              </div>
              {entry.sentiment.emotions && entry.sentiment.emotions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Detected emotions: {entry.sentiment.emotions.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Entry Content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{entry.metadata.wordCount} words</span>
              {entry.metadata.timeOfDay && (
                <>
                  <span>•</span>
                  <span className="capitalize">{entry.metadata.timeOfDay}</span>
                </>
              )}
              {entry.metadata.entryType === 'voice' && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    Voice Entry
                  </span>
                </>
              )}
            </div>
            
            {/* Show full transcript for voice entries */}
            {entry.metadata.entryType === 'voice' && entry.metadata.fullTranscript &&
             Array.isArray(entry.metadata.fullTranscript) &&
             entry.metadata.fullTranscript.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-[hsl(var(--color-muted))]/30 rounded-lg border border-border">
                  <button
                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-foreground mb-3 hover:opacity-70 transition-opacity"
                  >
                    <span>Full Conversation ({entry.metadata.fullTranscript.length} messages)</span>
                    {isTranscriptExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <div
                    className={`space-y-3 overflow-y-auto transition-all duration-200 ${
                      isTranscriptExpanded ? 'max-h-[600px]' : 'max-h-[200px]'
                    }`}
                  >
                    {entry.metadata.fullTranscript.map((msg: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-[hsl(var(--color-primary))]/10 border border-[hsl(var(--color-primary))]/20'
                            : 'bg-[hsl(var(--color-muted))]/50 border border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            msg.role === 'user'
                              ? 'text-[hsl(var(--color-primary))]'
                              : 'text-muted-foreground'
                          }`}>
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                  {!isTranscriptExpanded && (
                    <div className="mt-2 text-center">
                      <button
                        onClick={() => setIsTranscriptExpanded(true)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Click to expand full conversation
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-[hsl(var(--color-muted))]/20 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Your Journal Entry</h3>
                  <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                    {entry.content}
                  </p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  {entry.content}
                </p>
              </div>
            )}
          </div>

          {/* Original Prompt (if available) */}
          {entry.metadata.prompt && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Original Prompt:
              </p>
              <p className="text-sm text-foreground italic">
                "{entry.metadata.prompt}"
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>Created: {new Date(entry.createdAt).toLocaleString()}</p>
            {entry.updatedAt !== entry.createdAt && (
              <p>Last updated: {new Date(entry.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
