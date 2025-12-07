'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  getMoodZone, 
  getMoodEmoji, 
  getMoodLabel, 
  formatScore, 
  formatTooltipDate,
  calculateTrend,
  getMostCommonMood,
  MOOD_ZONES,
} from '@/lib/chartUtils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Smile, Frown, Meh, Info } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoint {
  date: string;
  score: number | null;
  hasEntries?: boolean;
  entryCount?: number;
}

type TimePeriod = 'weekly' | 'monthly' | '3months' | '6months' | '1year';

export function EmotionChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('weekly');

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stats?period=${period}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch chart data');
        const data = await res.json();
        setChartData(data.chartData || []);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
    
    // Refresh chart data when window regains focus (user might have created new entries)
    const handleFocus = () => {
      fetchChartData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Also refresh periodically (every 30 seconds) to catch updates
    const interval = setInterval(() => {
      fetchChartData();
    }, 30000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [period]);

  // Calculate summary statistics - MUST be before any conditional returns (Rules of Hooks)
  const summaryStats = useMemo(() => {
    const validScores = chartData
      .filter((point) => point.score !== null && point.hasEntries)
      .map((point) => point.score!);
    
    if (validScores.length === 0) {
      return null;
    }

    const average = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const trend = calculateTrend(validScores);
    const mostCommon = getMostCommonMood(validScores);
    const daysWithEntries = chartData.filter((p) => p.hasEntries).length;
    const totalDays = chartData.length;

    return {
      average,
      trend,
      mostCommon,
      daysWithEntries,
      totalDays,
    };
  }, [chartData]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-64 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--color-muted))] to-background rounded-xl border-2 border-dashed border-border">
          <div className="text-center max-w-md px-4">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Emotional Journey</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track how your mood changes day by day. Higher scores indicate more positive emotions.
            </p>
            <p className="text-sm text-muted-foreground">
              Create a few journal entries to see your emotional trends visualized here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format dates for display - show fewer labels for longer periods
  const getLabelInterval = () => {
    switch (period) {
      case 'weekly':
        return 1; // Every day
      case 'monthly':
        return 3; // Every 3 days
      case '3months':
        return 7; // Every week
      case '6months':
        return 14; // Every 2 weeks
      case '1year':
        return 30; // Every month
      default:
        return 1;
    }
  };

  const labelInterval = getLabelInterval();
  const labels = chartData.map((point, index) => {
    // Parse date string (YYYY-MM-DD) and format it
    const [year, month, day] = point.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Show label based on interval
    if (index % labelInterval === 0 || index === chartData.length - 1) {
      if (period === '1year') {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  });

  // Get sentiment color based on score
  const getSentimentColor = (score: number | null) => {
    if (score === null) return 'transparent';
    const zone = getMoodZone(score);
    return zone?.color || 'hsl(var(--color-muted))';
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Sentiment Score',
        data: chartData.map((point) => point.score),
        borderColor: 'hsl(var(--color-primary))',
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return 'transparent';
          }
          
          // Create gradient with color zones
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          const height = chartArea.bottom - chartArea.top;
          
          // Very Positive zone (0.85-1.0) - Green
          const veryPositiveStart = chartArea.top + (height * (1 - 0.85));
          const veryPositiveEnd = chartArea.top + (height * (1 - 0.7));
          gradient.addColorStop(0, 'hsla(142, 71%, 45%, 0.08)'); // Green
          gradient.addColorStop((veryPositiveStart - chartArea.top) / height, 'hsla(142, 71%, 45%, 0.08)');
          
          // Positive zone (0.7-0.85) - Light Green
          gradient.addColorStop((veryPositiveEnd - chartArea.top) / height, 'hsla(142, 71%, 45%, 0.05)');
          
          // Neutral zone (0.4-0.7) - Gray/Yellow
          const neutralStart = chartArea.top + (height * (1 - 0.7));
          const neutralEnd = chartArea.top + (height * (1 - 0.4));
          gradient.addColorStop((neutralStart - chartArea.top) / height, 'hsla(45, 93%, 47%, 0.03)'); // Yellow
          gradient.addColorStop((neutralEnd - chartArea.top) / height, 'hsla(45, 93%, 47%, 0.03)');
          
          // Negative zones (0-0.4) - Red
          gradient.addColorStop((neutralEnd - chartArea.top) / height, 'hsla(0, 84%, 60%, 0.05)'); // Red
          gradient.addColorStop(1, 'hsla(0, 84%, 60%, 0.08)');
          
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: chartData.map((point) => {
          if (point.hasEntries === false || point.score === null) return 0;
          // Make positive points slightly larger
          return point.score >= 0.7 ? 6 : 5;
        }),
        pointHoverRadius: chartData.map((point) => 
          point.hasEntries === false || point.score === null ? 0 : 8
        ),
        pointBackgroundColor: chartData.map((point) => 
          getSentimentColor(point.score)
        ),
        pointBorderColor: chartData.map((point) => 
          point.hasEntries === false || point.score === null
            ? 'transparent'
            : 'hsl(var(--color-primary))'
        ),
        pointBorderWidth: 2,
        spanGaps: false, // Don't connect points across gaps
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(0, 0%, 100%)',
        titleColor: 'hsl(222, 47%, 11%)',
        bodyColor: 'hsl(222, 47%, 11%)',
        borderColor: 'hsl(214, 32%, 91%)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          color: 'hsl(222, 47%, 11%)',
          weight: '600' as const,
        },
        bodyFont: {
          color: 'hsl(222, 47%, 11%)',
        },
        callbacks: {
          title: function (items: any[]) {
            if (items.length === 0) return '';
            const index = items[0].dataIndex;
            const point = chartData[index];
            return formatTooltipDate(point.date);
          },
          label: function (context: any) {
            const score = context.parsed.y;
            if (score === null) return 'No entries';
            
            const zone = getMoodZone(score);
            const emoji = zone?.emoji || '😐';
            const label = zone?.label || 'Unknown';
            const index = context.dataIndex;
            const point = chartData[index];
            const entryCount = point.entryCount || 0;
            
            return `${label} ${emoji} • ${formatScore(score)}${entryCount > 0 ? ` • ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}` : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--color-muted-foreground))',
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 0,
          callback: function(value: any, index: number) {
            const label = this.getLabelForValue(value);
            return label || '';
          },
        },
      },
      y: {
        min: 0,
        max: 1,
        grid: {
          color: function(context: any) {
            // Add reference lines at key thresholds with different colors
            const value = context.tick.value;
            if (value === 0.7 || value === 0.4) {
              return 'hsla(var(--color-border), 0.5)'; // Lighter for reference lines
            }
            return 'hsl(var(--color-border))';
          },
          lineWidth: function(context: any) {
            const value = context.tick.value;
            if (value === 0.7 || value === 0.4) {
              return 1.5; // Thicker reference lines
            }
            return 1;
          },
        },
        ticks: {
          color: 'hsl(var(--color-muted-foreground))',
          font: {
            size: 11,
          },
          stepSize: 0.1,
          callback: function (value: any) {
            // Show zone labels at key thresholds
            if (value === 0.85) return 'Very Positive 😊';
            if (value === 0.7) return 'Positive 🙂';
            if (value === 0.4) return 'Neutral 😐';
            if (value === 0.3) return 'Negative 😟';
            if (value === 0) return 'Very Negative 😔';
            // For other values, show percentage
            return `${(value * 100).toFixed(0)}%`;
          },
        },
      },
    },
  };

  const periodLabels: { [key in TimePeriod]: string } = {
    weekly: 'Week',
    monthly: 'Month',
    '3months': '3 Months',
    '6months': '6 Months',
    '1year': 'Year',
  };

  return (
    <div className="space-y-4">
      {/* Chart Title and Description */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Your Emotional Journey Over Time</h3>
        <p className="text-sm text-muted-foreground">
          Track how your mood changes day by day. Higher scores indicate more positive emotions.
        </p>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Average Mood</p>
                  <p className="text-lg font-semibold text-foreground">
                    {getMoodLabel(summaryStats.average)} {getMoodEmoji(summaryStats.average)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatScore(summaryStats.average)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trend</p>
                  <div className="flex items-center gap-2">
                    {summaryStats.trend.direction === 'improving' && (
                      <>
                        <TrendingUp className="w-4 h-4 text-[hsl(var(--color-positive))]" />
                        <p className="text-lg font-semibold text-[hsl(var(--color-positive))]">
                          Improving
                        </p>
                      </>
                    )}
                    {summaryStats.trend.direction === 'declining' && (
                      <>
                        <TrendingDown className="w-4 h-4 text-[hsl(var(--color-negative))]" />
                        <p className="text-lg font-semibold text-[hsl(var(--color-negative))]">
                          Declining
                        </p>
                      </>
                    )}
                    {summaryStats.trend.direction === 'stable' && (
                      <>
                        <Minus className="w-4 h-4 text-muted-foreground" />
                        <p className="text-lg font-semibold text-muted-foreground">
                          Stable
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.trend.percentage.toFixed(1)}% change
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Most Common</p>
                  <div className="flex items-center gap-2">
                    {summaryStats.mostCommon.mood === 'positive' && (
                      <Smile className="w-4 h-4 text-[hsl(var(--color-positive))]" />
                    )}
                    {summaryStats.mostCommon.mood === 'neutral' && (
                      <Meh className="w-4 h-4 text-muted-foreground" />
                    )}
                    {summaryStats.mostCommon.mood === 'negative' && (
                      <Frown className="w-4 h-4 text-[hsl(var(--color-negative))]" />
                    )}
                    <p className="text-lg font-semibold text-foreground capitalize">
                      {summaryStats.mostCommon.mood}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.mostCommon.percentage.toFixed(0)}% of entries
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Activity</p>
                  <p className="text-lg font-semibold text-foreground">
                    {summaryStats.daysWithEntries} / {summaryStats.totalDays}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    days with entries
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Time Period</h3>
        <div className="flex gap-2">
          {(['weekly', 'monthly', '3months', '6months', '1year'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-[hsl(var(--color-primary))] text-white'
                  : 'bg-[hsl(var(--color-muted))] text-muted-foreground hover:bg-[hsl(var(--color-border))]'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Color Zone Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground font-medium">Mood Zones:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[hsl(var(--color-negative))] opacity-60"></div>
              <span className="text-muted-foreground">Negative (0-40%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-400 opacity-60"></div>
              <span className="text-muted-foreground">Neutral (40-70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[hsl(var(--color-positive))] opacity-60"></div>
              <span className="text-muted-foreground">Positive (70-100%)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Hover over points to see details</span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-64 w-full relative">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
