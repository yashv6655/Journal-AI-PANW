import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import UserModel from '@/models/User';
import EntryModel from '@/models/Entry';
import SummaryModel from '@/models/Summary';
import { generateWeeklySummary } from '@/services/summaryService';

/**
 * Cron job endpoint for automatic weekly summary generation
 * Should be called by Vercel Cron or similar service
 * 
 * Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/summaries",
 *       "schedule": "0 0 * * 0"  // Every Sunday at midnight
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Generate weekly summaries on Sundays
    if (dayOfWeek === 0) {
      await generateWeeklySummariesForAllUsers();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Weekly summary generation completed',
      dayOfWeek,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to generate summaries' },
      { status: 500 }
    );
  }
}

async function generateWeeklySummariesForAllUsers() {
  try {
    const users = await UserModel.find({}).lean();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    let generated = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if user has entries in the period
        const entryCount = await EntryModel.countDocuments({
          userId: user._id.toString(),
          createdAt: { $gte: startDate, $lte: endDate },
        });

        if (entryCount === 0) {
          continue; // Skip users with no entries
        }

        // Check if summary already exists for this period
        const existingSummary = await SummaryModel.findOne({
          userId: user._id.toString(),
          type: 'weekly',
          'period.start': startDate,
          'period.end': endDate,
        });

        if (existingSummary) {
          continue; // Skip if summary already exists
        }

        // Generate summary
        const summaryData = await generateWeeklySummary(
          user._id.toString(),
          startDate,
          endDate
        );

        const summary = new SummaryModel(summaryData);
        await summary.save();
        generated++;
      } catch (error) {
        console.error(`Error generating summary for user ${user._id}:`, error);
        errors++;
      }
    }

    console.log(`Weekly summaries: ${generated} generated, ${errors} errors`);
    return { generated, errors };
  } catch (error) {
    console.error('Error generating weekly summaries:', error);
    throw error;
  }
}
