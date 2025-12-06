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

    // Calculate date range based on period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userSignupDate = new Date(user.createdAt);
    userSignupDate.setHours(0, 0, 0, 0);
    
    let startDate = new Date();
    switch (period) {
      case 'weekly':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 7);
    }
    startDate.setHours(0, 0, 0, 0);
    
    // Use signup date if it's more recent than the calculated start date
    if (userSignupDate > startDate) {
      startDate = userSignupDate;
    }

    const entries = await EntryModel.find({
      userId: session.user.id,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: 1 })
      .lean();

    // Helper function to get local date string (YYYY-MM-DD) from a date
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Group entries by day and calculate average sentiment
    const sentimentByDay: { [key: string]: { score: number; count: number } } = {};

    entries.forEach((entry) => {
      // Use local date instead of UTC to avoid timezone issues
      const entryDate = new Date(entry.createdAt);
      const date = getLocalDateString(entryDate);
      if (!sentimentByDay[date]) {
        sentimentByDay[date] = { score: 0, count: 0 };
      }
      if (entry.sentiment) {
        sentimentByDay[date].score += entry.sentiment.score;
        sentimentByDay[date].count += 1;
      }
    });

    // Generate chart data for all days in the period, including days with no entries
    const chartData: { date: string; score: number | null; hasEntries: boolean }[] = [];
    const currentDate = new Date(startDate);
    
    // Iterate through all days from startDate to today
    while (currentDate <= today) {
      const dateString = getLocalDateString(currentDate);
      
      if (sentimentByDay[dateString]) {
        const data = sentimentByDay[dateString];
        chartData.push({
          date: dateString,
          score: data.count > 0 ? data.score / data.count : 0.5,
          hasEntries: true,
        });
      } else {
        // Include day with no entries (will be shown as gap in chart)
        chartData.push({
          date: dateString,
          score: null, // Use null to create gaps in the chart
          hasEntries: false,
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
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
        totalEntries: actualEntryCount,
        currentStreak: user?.stats?.currentStreak || 0,
        longestStreak: user?.stats?.longestStreak || 0,
      },
      chartData,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
