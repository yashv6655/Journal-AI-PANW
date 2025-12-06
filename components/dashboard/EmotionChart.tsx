'use client';

import { useEffect, useState } from 'react';
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

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--color-muted))] to-background rounded-xl border-2 border-dashed border-border">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-muted-foreground px-4">
            Chart will appear here after you create more entries
          </p>
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
  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'hsl(var(--color-positive))';
    if (score >= 0.4) return 'hsl(var(--color-muted))';
    return 'hsl(var(--color-negative))';
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
          // Create subtle gradient fill (light blue to transparent)
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'hsla(221, 83%, 53%, 0.15)'); // Light blue at top
          gradient.addColorStop(1, 'hsla(221, 83%, 53%, 0.02)'); // Almost transparent at bottom
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: chartData.map((point) => 
          point.hasEntries === false || point.score === null ? 0 : 5
        ),
        pointHoverRadius: chartData.map((point) => 
          point.hasEntries === false || point.score === null ? 0 : 7
        ),
        pointBackgroundColor: chartData.map((point) => 
          point.hasEntries === false || point.score === null
            ? 'transparent' 
            : getSentimentColor(point.score)
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
          label: function (context: any) {
            const score = context.parsed.y;
            const sentiment = score >= 0.7 ? 'Positive' : score >= 0.4 ? 'Neutral' : 'Negative';
            return `Sentiment: ${sentiment} (${(score * 100).toFixed(0)}%)`;
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
          color: 'hsl(var(--color-border))',
        },
        ticks: {
          color: 'hsl(var(--color-muted-foreground))',
          font: {
            size: 12,
          },
          callback: function (value: any) {
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
      
      {/* Chart */}
      <div className="h-64 w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
