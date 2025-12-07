'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Loader2 } from 'lucide-react';

type JournalingGoal = 'stress_relief' | 'self_discovery' | 'habit_building' | null;

const GOAL_OPTIONS: { value: JournalingGoal; label: string; description: string }[] = [
  {
    value: 'stress_relief',
    label: 'Stress Relief',
    description: 'Manage anxiety and find moments of calm',
  },
  {
    value: 'self_discovery',
    label: 'Self Discovery',
    description: 'Understand yourself and explore personal growth',
  },
  {
    value: 'habit_building',
    label: 'Habit Building',
    description: 'Build consistent journaling routines',
  },
];

export function GoalSelector() {
  const [currentGoal, setCurrentGoal] = useState<JournalingGoal>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoal();
  }, []);

  const fetchGoal = async () => {
    try {
      const res = await fetch('/api/user/goals');
      if (!res.ok) throw new Error('Failed to fetch goal');
      const data = await res.json();
      setCurrentGoal(data.journalingGoal);
    } catch (error) {
      console.error('Error fetching goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async (goal: JournalingGoal) => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalingGoal: goal }),
      });

      if (!res.ok) throw new Error('Failed to update goal');
      
      const data = await res.json();
      setCurrentGoal(data.journalingGoal);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 bg-[hsl(var(--color-muted))] rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--color-primary))]/10">
            <Target className="w-5 h-5 text-[hsl(var(--color-primary))]" />
          </div>
          <CardTitle className="text-2xl">Journaling Goal</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set your journaling goal to receive personalized prompts tailored to your needs.
        </p>
        <div className="grid gap-3">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateGoal(option.value)}
              disabled={saving}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                currentGoal === option.value
                  ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary))]/10'
                  : 'border-border hover:border-[hsl(var(--color-primary))]/50 hover:bg-[hsl(var(--color-muted))]/50'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{option.label}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {currentGoal === option.value && (
                  <div className="ml-4 p-1 rounded-full bg-[hsl(var(--color-primary))]">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            onClick={() => updateGoal(null)}
            disabled={saving || currentGoal === null}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Clear Goal'
            )}
          </Button>
        </div>
        {currentGoal && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Your prompts will be personalized based on your goal: {GOAL_OPTIONS.find(o => o.value === currentGoal)?.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
