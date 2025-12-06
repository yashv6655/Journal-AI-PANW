'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Search, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchEntries();
  }, [page]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const res = await fetch(`/api/entries?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter entries based on search and sentiment
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = searchQuery === '' || 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === 'all' || 
      entry.sentiment.overall === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-6 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse mb-4" />
                <div className="h-4 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">All Entries</h1>
        <p className="text-xl text-muted-foreground">
          Browse and search through your journal entries
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sentiment Filter */}
            <div className="flex gap-2">
              <Button
                variant={sentimentFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('all')}
              >
                All
              </Button>
              <Button
                variant={sentimentFilter === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('positive')}
              >
                😊 Positive
              </Button>
              <Button
                variant={sentimentFilter === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('neutral')}
              >
                😐 Neutral
              </Button>
              <Button
                variant={sentimentFilter === 'negative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('negative')}
              >
                😔 Negative
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">
              {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {entries.length === 0
                ? 'Start your journaling journey by writing your first entry'
                : 'Try adjusting your search or filter criteria'}
            </p>
            {entries.length === 0 && (
              <Link href="/entries/new">
                <Button>
                  Create your first entry
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const preview = entry.content.substring(0, 200);
              const truncated = entry.content.length > 200;

              return (
                <Link key={entry._id} href={`/entries/${entry._id}`}>
                  <Card className="card-hover cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <Badge variant={getSentimentVariant(entry.sentiment.overall)}>
                              {getSentimentEmoji(entry.sentiment.overall)} {entry.sentiment.overall}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              • {entry.metadata.wordCount} words
                            </span>
                            {entry.sentiment.emotions && entry.sentiment.emotions.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                • {entry.sentiment.emotions.slice(0, 2).join(', ')}
                              </span>
                            )}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
