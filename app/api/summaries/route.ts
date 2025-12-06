import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import SummaryModel from '@/models/Summary';
import { generateWeeklySummary } from '@/services/summaryService';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly';
    const limit = parseInt(searchParams.get('limit') || '5');

    await connectDB();

    const summaries = await SummaryModel.find({
      userId: session.user.id,
      type,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Convert MongoDB dates to ISO strings
    const formattedSummaries = summaries.map((summary) => ({
      ...summary,
      _id: summary._id.toString(),
      period: {
        start: summary.period.start.toISOString(),
        end: summary.period.end.toISOString(),
      },
      createdAt: summary.createdAt.toISOString(),
    }));

    return NextResponse.json({ summaries: formattedSummaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
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

    // Rate limiting: 5 requests per hour per user (summaries are expensive)
    const rateLimitKey = `summaries:${session.user.id}`;
    const rateLimitResult = rateLimit(rateLimitKey, 5, 3600000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before generating another summary.' },
        { status: 429 }
      );
    }

    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate summary using AI
    const summaryData = await generateWeeklySummary(session.user.id, start, end);

    await connectDB();

    // Save summary to database
    const summary = new SummaryModel(summaryData);
    await summary.save();

    // Convert to plain object with ISO date strings
    const summaryObj = summary.toObject();
    const formattedSummary = {
      ...summaryObj,
      _id: summaryObj._id.toString(),
      period: {
        start: summaryObj.period.start.toISOString(),
        end: summaryObj.period.end.toISOString(),
      },
      createdAt: summaryObj.createdAt.toISOString(),
    };

    return NextResponse.json({ summary: formattedSummary }, { status: 201 });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
