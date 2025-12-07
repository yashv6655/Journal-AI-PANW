import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import EntryModel from '@/models/Entry';
import UserModel from '@/models/User';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 30 requests per minute per user
    const rateLimitKey = `stats:${session.user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 30, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    // Get user stats and signup date
    const user = await UserModel.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get period from query parameter (default to 'weekly')
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly';

    // Helper function to get UTC date string (YYYY-MM-DD) from a date
    const getUTCDateString = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Normalize date to UTC midnight
    const normalizeToUTCMidnight = (date: Date): Date => {
      const normalized = new Date(date);
      normalized.setUTCHours(0, 0, 0, 0);
      return normalized;
    };

    // Calculate date range based on period - all in UTC
    const today = normalizeToUTCMidnight(new Date());

    const userSignupDate = normalizeToUTCMidnight(new Date(user.createdAt));

    let startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    switch (period) {
      case 'weekly':
        startDate.setUTCDate(today.getUTCDate() - 7);
        break;
      case 'monthly':
        startDate.setUTCMonth(today.getUTCMonth() - 1);
        break;
      case '3months':
        startDate.setUTCMonth(today.getUTCMonth() - 3);
        break;
      case '6months':
        startDate.setUTCMonth(today.getUTCMonth() - 6);
        break;
      case '1year':
        startDate.setUTCFullYear(today.getUTCFullYear() - 1);
        break;
      default:
        startDate.setUTCDate(today.getUTCDate() - 7);
    }
    startDate.setUTCHours(0, 0, 0, 0);

    // Ensure startDate is not before signup date
    if (userSignupDate > startDate) {
      startDate = new Date(userSignupDate);
    }

    const entries = await EntryModel.find({
      userId: session.user.id,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Group entries by day and calculate average sentiment
    const sentimentByDay: Record<string, { score: number; count: number }> = {};

    // Also collect all individual entry scores for accurate mood statistics
    const allEntryScores: number[] = [];

    entries.forEach((entry: { createdAt: Date | string; sentiment?: { score: number } }) => {
      // Use UTC date string for consistent grouping
      const entryDate = new Date(entry.createdAt);
      const date = getUTCDateString(entryDate);
      if (!sentimentByDay[date]) {
        sentimentByDay[date] = { score: 0, count: 0 };
      }
      if (entry.sentiment) {
        sentimentByDay[date].score += entry.sentiment.score;
        sentimentByDay[date].count += 1;
        allEntryScores.push(entry.sentiment.score);
      }
    });

    // Generate chart data for all days in the period, including days with no entries
    const chartData: Array<{
      date: string;
      score: number | null;
      hasEntries: boolean;
      entryCount?: number;
    }> = [];
    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0);

    // Iterate through all days from startDate to today (both in UTC)
    while (currentDate <= today) {
      const dateString = getUTCDateString(currentDate);

      if (sentimentByDay[dateString]) {
        const data = sentimentByDay[dateString];
        chartData.push({
          date: dateString,
          score: data.count > 0 ? data.score / data.count : 0.5,
          hasEntries: true,
          entryCount: data.count,
        });
      } else {
        // Include day with no entries (will be shown as gap in chart)
        chartData.push({
          date: dateString,
          score: null,
          hasEntries: false,
          entryCount: 0,
        });
      }

      // Move to next day using UTC
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Sync totalEntries with actual database count to ensure accuracy
    const actualEntryCount = await EntryModel.countDocuments({ userId: session.user.id });

    // Update user stats if there's a discrepancy (need to fetch non-lean user for saving)
    if (user && user.stats.totalEntries !== actualEntryCount) {
      const userDoc = await UserModel.findById(session.user.id);
      if (userDoc) {
        userDoc.stats.totalEntries = actualEntryCount;
        await userDoc.save();
      }
    }

    return NextResponse.json({
      stats: {
        totalEntries: actualEntryCount || 0,
        currentStreak: user?.stats?.currentStreak || 0,
        longestStreak: user?.stats?.longestStreak || 0,
      },
      chartData: chartData || [],
      allEntryScores: allEntryScores || [], // Individual entry scores for accurate statistics
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
