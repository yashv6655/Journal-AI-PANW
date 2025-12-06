export interface SentimentResult {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1
  emotions: string[];
  confidence: number;
}

export interface JournalEntry {
  _id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  sentiment?: SentimentResult;
  metadata: {
    wordCount: number;
    prompt?: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  tags?: string[];
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  password: string;
  createdAt: Date;
  preferences: {
    journalingGoal?: 'stress_relief' | 'self_discovery' | 'habit_building';
    journalingFrequency?: 'never' | 'occasionally' | 'regularly';
    preferredTime?: 'morning' | 'evening' | 'anytime';
  };
  stats: {
    totalEntries: number;
    currentStreak: number;
    longestStreak: number;
    lastEntryDate?: Date;
  };
}

export interface WeeklySummary {
  _id: string;
  userId: string;
  type: 'weekly' | 'monthly';
  period: {
    start: Date;
    end: Date;
  };
  content: string;
  insights: string[];
  entriesAnalyzed: number;
  createdAt: Date;
}

export interface PromptCache {
  _id: string;
  userId: string;
  prompt: string;
  context: string[];
  createdAt: Date;
  used: boolean;
}

export interface DailyPrompt {
  _id: string;
  userId: string;
  prompt: string;
  date: string; // YYYY-MM-DD
  answeredAt?: Date;
  createdAt: Date;
}

export interface PromptResponse {
  prompt: string;
  answered: boolean;
  cooldownUntil?: Date;
  canAnswer: boolean;
  context?: string | null;
}

export interface WritingPromptResponse {
  type: 'completion' | 'question' | null;
  message?: string; // For completion
  question?: string; // For follow-up questions
  sentiment?: SentimentResult;
}
