import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import EntryModel from '@/models/Entry';
import CorrelationAnalysisModel from '@/models/CorrelationAnalysis';
import { connectDB } from '@/lib/db';

export interface CorrelationInsight {
  correlation: string;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  examples: string[];
}

export async function findCorrelations(userId: string, limit: number = 50, forceRefresh: boolean = false): Promise<CorrelationInsight[]> {
  try {
    await connectDB();

    // Check for cached analysis first (unless force refresh)
    // Cache is automatically invalidated when new entries are created,
    // so we can trust it if it exists without querying the database
    if (!forceRefresh) {
      const cached = await CorrelationAnalysisModel.findOne({ userId }).lean();
      if (cached && cached.correlations && cached.correlations.length > 0) {
        // Cache exists and is valid - return it immediately
        // No need to check database - cache is invalidated on new entry creation
        return cached.correlations;
      }
    }

    // Fetch recent entries for analysis
    const entries = await EntryModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (entries.length < 10) {
      // Need at least 10 entries to find meaningful correlations
      return [];
    }

    // Create entry summaries with dates and sentiments
    const entrySummaries = entries.map((entry, i) => {
      const date = new Date(entry.createdAt).toLocaleDateString();
      const sentiment = entry.sentiment?.overall || 'neutral';
      const score = entry.sentiment?.score || 0.5;
      const emotions = entry.sentiment?.emotions?.join(', ') || 'none';
      const preview = entry.content.substring(0, 250);
      return `Entry ${i + 1} (${date}, sentiment: ${sentiment}, score: ${score.toFixed(2)}, emotions: ${emotions}):\n"${preview}${entry.content.length > 250 ? '...' : ''}"`;
    });

    const aiPrompt = `Analyze these ${entries.length} journal entries to identify non-obvious correlations and patterns between activities, events, and emotional states.

${entrySummaries.join('\n\n---\n\n')}

Look for correlations such as:
- Activities or events that correlate with positive/negative emotions
- Time patterns (e.g., "On days you mentioned exercise, your entries were more positive")
- Behavioral patterns (e.g., "You felt most energized on days you had a morning walk")
- Relationship patterns (e.g., "Your mood improved significantly after entries mentioning time with friends")
- Work-life patterns (e.g., "On days you wrote about work stress, your entries were more negative")

Return a JSON object with this structure:
{
  "correlations": [
    {
      "correlation": "Specific correlation statement (e.g., 'On days you mentioned exercise, your entries were 40% more positive')",
      "strength": "strong" | "moderate" | "weak",
      "description": "Brief explanation of why this correlation matters",
      "examples": ["example 1", "example 2"]
    }
  ]
}

Focus on:
- Non-obvious patterns that help the user understand themselves
- Specific, actionable correlations
- Patterns that appear consistently across multiple entries
- Both positive and negative correlations

Be specific with percentages or frequencies when possible. Return 2-4 most significant correlations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
        { role: 'user', content: aiPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.correlations || !Array.isArray(result.correlations)) {
      return [];
    }

    // Validate and format correlations
    const correlations: CorrelationInsight[] = result.correlations
      .filter((c: any) => c.correlation && c.strength)
      .map((c: any) => ({
        correlation: c.correlation,
        strength: (c.strength === 'strong' || c.strength === 'moderate' || c.strength === 'weak')
          ? c.strength
          : 'moderate',
        description: c.description || '',
        examples: Array.isArray(c.examples) ? c.examples.slice(0, 2) : [],
      }))
      .slice(0, 4); // Top 4 correlations

    // Get the latest entry for tracking
    const latestEntry = entries[0];
    
    // Save to cache
    await CorrelationAnalysisModel.findOneAndUpdate(
      { userId },
      {
        userId,
        correlations,
        lastEntryId: latestEntry._id.toString(),
        lastEntryDate: latestEntry.createdAt,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return correlations;
  } catch (error) {
    console.error('Error finding correlations:', error);
    return [];
  }
}
