import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeSentiment } from '@/services/sentimentService';
import { generateWritingPrompt } from '@/services/writingPromptService';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 30 requests per minute per user (more lenient for real-time prompts)
    const rateLimitKey = `writing-prompts:${session.user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 30, 60000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { content, type } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const wordCount = content.trim().split(/\s+/).length;

    // Handle completion check
    if (type === 'completion-check') {
      // Minimum word count for completion check
      if (wordCount < 50) {
        return NextResponse.json({
          type: null,
        });
      }

      // Analyze sentiment of the current draft
      const sentiment = await analyzeSentiment(content);

      // Check completion status
      const result = await generateWritingPrompt(content, sentiment, 'completion-check');

      return NextResponse.json(result);
    }

    // Handle follow-up question (default behavior)
    // Minimum content length for meaningful analysis
    if (wordCount < 15) {
      return NextResponse.json(
        { error: 'Content too short for analysis' },
        { status: 400 }
      );
    }

    // Analyze sentiment of the current draft
    const sentiment = await analyzeSentiment(content);

    // Generate contextual question based on content and sentiment
    const result = await generateWritingPrompt(content, sentiment, 'follow-up');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating writing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate writing prompt' },
      { status: 500 }
    );
  }
}
