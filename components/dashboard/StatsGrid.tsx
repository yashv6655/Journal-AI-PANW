import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Flame, Trophy } from 'lucide-react';

interface StatsGridProps {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
}

export function StatsGrid({ totalEntries, currentStreak, longestStreak }: StatsGridProps) {
  const stats = [
    {
      label: 'Total Entries',
      value: totalEntries,
      icon: BookOpen,
      color: 'text-[hsl(var(--color-primary))]',
      bgColor: 'bg-[hsl(var(--color-primary))]/10',
    },
    {
      label: 'Current Streak',
      value: `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`,
      icon: Flame,
      color: 'text-[hsl(var(--color-accent))]',
      bgColor: 'bg-[hsl(var(--color-accent))]/10',
    },
    {
      label: 'Longest Streak',
      value: `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`,
      icon: Trophy,
      color: 'text-[hsl(var(--color-neutral))]',
      bgColor: 'bg-[hsl(var(--color-neutral))]/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
