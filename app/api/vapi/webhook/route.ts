import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import EntryModel from '@/models/Entry';
import UserModel from '@/models/User';
import DailyPromptModel from '@/models/DailyPrompt';
import { analyzeSentiment } from '@/services/sentimentService';
import { getTimeOfDay } from '@/lib/utils';
import { extractUserContent } from '@/services/voiceJournalService';
import type { VapiTranscript } from '@/types';

/**
 * Optional webhook endpoint for Vapi server-side processing
 * This can be used as an alternative to client-side processing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if Vapi provides one)
    // For now, we'll accept all requests - add signature verification in production
    
    const body = await request.json();
    const event = body.event || body.type;

    // Handle different Vapi webhook events
    switch (event) {
      case 'call-end':
      case 'call-ended':
        return await handleCallEnd(body);
      
      case 'status-update':
        // Just acknowledge status updates
        return NextResponse.json({ received: true });
      
      case 'transcript':
        // Real-time transcript updates (optional)
        return NextResponse.json({ received: true });
      
      default:
        return NextResponse.json({ received: true, event });
    }
  } catch (error) {
    console.error('Vapi webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCallEnd(body: any) {
  try {
    await connectDB();

    // Extract user ID from webhook metadata (you'll need to pass this when creating the call)
    const userId = body.metadata?.userId || body.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in webhook' },
        { status: 400 }
      );
    }

    // Get transcript from webhook
    const transcript: VapiTranscript = body.transcript || {
      messages: body.messages || [],
      callId: body.callId,
      duration: body.duration,
    };

    // Extract user content from transcript
    const userContent = extractUserContent(transcript);

    if (!userContent || userContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No user content found in transcript' },
        { status: 400 }
      );
    }

    // Get prompt from metadata
    const prompt = body.metadata?.prompt || '';

    // Analyze sentiment
    const sentiment = await analyzeSentiment(userContent);

    // Calculate word count
    const wordCount = userContent.trim().split(/\s+/).length;

    // Create entry
    const entry = new EntryModel({
      userId,
      content: userContent,
      sentiment,
      metadata: {
        wordCount,
        prompt,
        timeOfDay: getTimeOfDay(),
      },
      tags: [],
    });

    await entry.save();

    // Check if this entry answers today's daily prompt
    if (prompt && prompt.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const promptText = prompt.trim();
      
      const dailyPrompt = await DailyPromptModel.findOne({
        userId,
        date: today,
      });

      if (dailyPrompt && !dailyPrompt.answeredAt) {
        const dailyPromptText = dailyPrompt.prompt.trim();
        if (dailyPromptText.toLowerCase() === promptText.toLowerCase()) {
          dailyPrompt.answeredAt = new Date();
          await dailyPrompt.save();
        }
      }
    }

    // Update user stats
    const user = await UserModel.findById(userId);
    if (user) {
      user.stats.totalEntries += 1;
      await user.updateStreak();
    }

    return NextResponse.json({ 
      success: true, 
      entryId: entry._id.toString() 
    });
  } catch (error) {
    console.error('Error processing call end:', error);
    return NextResponse.json(
      { error: 'Failed to process call end' },
      { status: 500 }
    );
  }
}
