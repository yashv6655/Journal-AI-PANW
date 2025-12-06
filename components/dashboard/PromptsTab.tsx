'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Topic } from '@/services/topicService';

interface PromptsTabProps {
  onSelectPrompt?: (prompt: string) => void;
}

export function PromptsTab({ onSelectPrompt }: PromptsTabProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Separate dynamic topics from curated topics
  const dynamicTopics = topics.filter((t) => t.category !== 'general');
  const curatedTopics = topics.filter((t) => t.category === 'general');

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      if (!res.ok) throw new Error('Failed to fetch topics');
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicName: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicName)) {
      newExpanded.delete(topicName);
    } else {
      newExpanded.add(topicName);
    }
    setExpandedTopics(newExpanded);
  };

  const handleUsePrompt = (prompt: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    } else {
      // Navigate to entry editor with prompt in query param
      router.push(`/entries/new?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'struggle':
        return 'border-[hsl(var(--color-negative))]/30 bg-[hsl(var(--color-negative))]/5';
      case 'growth':
        return 'border-[hsl(var(--color-positive))]/30 bg-[hsl(var(--color-positive))]/5';
      default:
        return 'border-[hsl(var(--color-primary))]/30 bg-[hsl(var(--color-primary))]/5';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'struggle':
        return '💪';
      case 'growth':
        return '🌱';
      default:
        return '💭';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-4">💭</div>
          <h3 className="text-xl font-semibold mb-2">No topics available</h3>
          <p className="text-muted-foreground">
            Topics will appear as you write more entries
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-6">
        Explore prompts tailored to your journaling journey. Personalized topics are based on your recent entries.
      </p>

      {/* Dynamic Topics (Personalized) */}
      {dynamicTopics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[hsl(var(--color-primary))]" />
            <h3 className="text-lg font-semibold">Personalized for You</h3>
          </div>
          <div className="space-y-4">
            {dynamicTopics.map((topic, idx) => {
              const isExpanded = expandedTopics.has(topic.name);
              const categoryColor = getCategoryColor(topic.category);
              const categoryIcon = getCategoryIcon(topic.category);

              return (
                <Card key={`dynamic-${idx}`} className={`border-2 ${categoryColor} transition-all`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleTopic(topic.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{categoryIcon}</span>
                          <CardTitle className="text-xl">{topic.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            For You
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {topic.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTopic(topic.name);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {topic.prompts.map((prompt, promptIdx) => (
                          <div
                            key={promptIdx}
                            className="p-4 rounded-xl bg-background border border-border hover:border-[hsl(var(--color-primary))]/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-foreground leading-relaxed flex-1">
                                {prompt}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleUsePrompt(prompt)}
                                className="flex-shrink-0"
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Curated Topics */}
      {curatedTopics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-[hsl(var(--color-secondary))]" />
            <h3 className="text-lg font-semibold">Explore Topics</h3>
          </div>
          <div className="space-y-4">
            {curatedTopics.map((topic, idx) => {
              const isExpanded = expandedTopics.has(topic.name);
              const categoryColor = getCategoryColor(topic.category);
              const categoryIcon = getCategoryIcon(topic.category);

              return (
                <Card key={`curated-${idx}`} className={`border-2 ${categoryColor} transition-all`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleTopic(topic.name)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{categoryIcon}</span>
                          <CardTitle className="text-xl">{topic.name}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {topic.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTopic(topic.name);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {topic.prompts.map((prompt, promptIdx) => (
                          <div
                            key={promptIdx}
                            className="p-4 rounded-xl bg-background border border-border hover:border-[hsl(var(--color-primary))]/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-foreground leading-relaxed flex-1">
                                {prompt}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handleUsePrompt(prompt)}
                                className="flex-shrink-0"
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
