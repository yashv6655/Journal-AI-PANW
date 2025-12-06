import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import UserModel from '@/models/User';
import EntryModel from '@/models/Entry';
import Link from 'next/link';
import { PromptCard } from '@/components/dashboard/PromptCard';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { EntryList } from '@/components/dashboard/EntryList';
import { EmotionChart } from '@/components/dashboard/EmotionChart';
import { ThemeInsights } from '@/components/dashboard/ThemeInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await connectDB();

  // Fetch user stats
  const user = await UserModel.findById(session.user.id).lean();

  // Fetch recent entries (last 5)
  const entries = await EntryModel.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Convert MongoDB documents to plain objects
  const plainEntries = entries.map((entry) => ({
    ...entry,
    _id: entry._id.toString(),
    userId: entry.userId.toString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }));

  const stats = user?.stats || {
    totalEntries: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          Welcome Back<span className="gradient-text">{user?.name ? `, ${user?.name}` : ''}</span>!
        </h1>
        <p className="text-xl text-muted-foreground">
          Here&apos;s what&apos;s happening with your journaling journey
        </p>
      </div>

      {/* AI Prompt Card */}
      <PromptCard />

      {/* Stats Grid */}
      <StatsGrid
        totalEntries={stats.totalEntries}
        currentStreak={stats.currentStreak}
        longestStreak={stats.longestStreak}
      />

      {/* Emotion Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--color-primary))]/10">
              <TrendingUp className="w-5 h-5 text-[hsl(var(--color-primary))]" />
            </div>
            <CardTitle className="text-2xl">Emotional Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmotionChart />
        </CardContent>
      </Card>

      {/* Theme Insights */}
      <ThemeInsights />

      {/* Recent Entries */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Recent Entries</h2>
          {plainEntries.length > 0 && (
            <Link
              href="/entries"
              className="text-sm font-semibold text-[hsl(var(--color-primary))] hover:underline flex items-center gap-1"
            >
              View all
              <span>→</span>
            </Link>
          )}
        </div>
        <EntryList entries={plainEntries as any} />
      </div>
    </div>
  );
}
