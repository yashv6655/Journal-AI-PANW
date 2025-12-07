import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import EntryModel from '@/models/Entry';
import UserModel from '@/models/User';
import DailyPromptModel from '@/models/DailyPrompt';
import { analyzeSentiment } from '@/services/sentimentService';
import { getTimeOfDay } from '@/lib/utils';
import { rateLimit, getRateLimitKey } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    await connectDB();

    const entries = await EntryModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await EntryModel.countDocuments({ userId: session.user.id });

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitKey = `entries:${session.user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 20, 60000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          resetTime: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    const { content, prompt, tags, fullTranscript, entryType } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Entry content is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Analyze sentiment in parallel with creating entry
    const sentimentPromise = analyzeSentiment(content);

    // Calculate word count
    const wordCount = content.trim().split(/\s+/).length;

    // Create entry
    const entry = new EntryModel({
      userId: session.user.id,
      content,
      metadata: {
        wordCount,
        prompt,
        timeOfDay: getTimeOfDay(),
        entryType: entryType || 'text', // 'text' or 'voice'
        fullTranscript: fullTranscript || undefined, // Store full transcript for voice entries
      },
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    });

    // Wait for sentiment analysis
    const sentiment = await sentimentPromise;
    entry.sentiment = sentiment;

    // Save entry
    await entry.save();

    // Check if this entry answers today's daily prompt
    if (prompt && prompt.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const promptText = prompt.trim();
      
      // Find today's daily prompt
      const dailyPrompt = await DailyPromptModel.findOne({
        userId: session.user.id,
        date: today,
      });

      // Check if the entry's prompt matches today's daily prompt (case-insensitive, trimmed)
      if (dailyPrompt && !dailyPrompt.answeredAt) {
        const dailyPromptText = dailyPrompt.prompt.trim();
        // Match if prompts are the same (case-insensitive comparison)
        if (dailyPromptText.toLowerCase() === promptText.toLowerCase()) {
          // Mark prompt as answered
          dailyPrompt.answeredAt = new Date();
          await dailyPrompt.save();
        }
      }
    }

    // Update user stats (streak and total entries)
    const user = await UserModel.findById(session.user.id);
    if (user) {
      user.stats.totalEntries += 1;
      await user.updateStreak(); // This saves the user, so totalEntries will be saved too
    }

    // Invalidate analysis caches - will be regenerated on next request
    // We don't regenerate here to avoid blocking the entry creation response
    try {
      const ThemeAnalysisModel = (await import('@/models/ThemeAnalysis')).default;
      const CorrelationAnalysisModel = (await import('@/models/CorrelationAnalysis')).default;
      const TopicAnalysisModel = (await import('@/models/TopicAnalysis')).default;
      
      await Promise.all([
        ThemeAnalysisModel.deleteOne({ userId: session.user.id }),
        CorrelationAnalysisModel.deleteOne({ userId: session.user.id }),
        TopicAnalysisModel.deleteOne({ userId: session.user.id }),
      ]);
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to invalidate analysis caches:', error);
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}
