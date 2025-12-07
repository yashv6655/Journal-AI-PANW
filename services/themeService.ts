import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import EntryModel from '@/models/Entry';
import ThemeAnalysisModel from '@/models/ThemeAnalysis';
import { connectDB } from '@/lib/db';

export interface ThemeInsight {
  theme: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  examples: string[];
  description: string;
}

export async function extractThemes(userId: string, limit: number = 50, forceRefresh: boolean = false): Promise<ThemeInsight[]> {
  try {
    await connectDB();

    // Check for cached analysis first (unless force refresh)
    // Cache is automatically invalidated when new entries are created,
    // so we can trust it if it exists without querying the database
    if (!forceRefresh) {
      const cached = await ThemeAnalysisModel.findOne({ userId }).lean();
      if (cached && cached.themes && cached.themes.length > 0) {
        // Cache exists and is valid - return it immediately
        // No need to check database - cache is invalidated on new entry creation
        return cached.themes;
      }
    }

    // Fetch recent entries for analysis
    const entries = await EntryModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (entries.length === 0) {
      return [];
    }

    // Create entry summaries for AI analysis
    const entrySummaries = entries.map((entry, i) => {
      const date = new Date(entry.createdAt).toLocaleDateString();
      const sentiment = entry.sentiment?.overall || 'unknown';
      const emotions = entry.sentiment?.emotions?.join(', ') || 'none';
      const preview = entry.content.substring(0, 200);
      return `Entry ${i + 1} (${date}, ${sentiment}, emotions: ${emotions}):\n"${preview}${entry.content.length > 200 ? '...' : ''}"`;
    });

    const aiPrompt = `Analyze these ${entries.length} journal entries and identify the recurring themes, topics, and patterns the user writes about.

${entrySummaries.join('\n\n---\n\n')}

Identify 3-6 recurring themes or topics. For each theme, provide:
- A clear, specific theme name (e.g., "Work Stress", "Family Relationships", "Creative Projects", "Health & Wellness")
- The overall sentiment associated with this theme (positive, neutral, or negative)
- 2-3 brief examples or quotes from the entries that illustrate this theme
- A brief description of why this theme is significant

Return a JSON object with this structure:
{
  "themes": [
    {
      "theme": "Theme name",
      "frequency": number of times mentioned,
      "sentiment": "positive" | "neutral" | "negative",
      "examples": ["example 1", "example 2"],
      "description": "Why this theme matters"
    }
  ]
}

Focus on:
- Recurring topics, concerns, or interests
- Emotional patterns around specific themes
- Activities or relationships frequently mentioned
- Struggles or growth areas
- Positive patterns worth noting

Be specific and avoid generic themes. Prioritize themes that appear multiple times.`;

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
    
    if (!result.themes || !Array.isArray(result.themes)) {
      return [];
    }

    // Validate and format themes
    const themes: ThemeInsight[] = result.themes
      .filter((t: any) => t.theme && t.frequency >= 2) // Only themes mentioned 2+ times
      .map((t: any) => ({
        theme: t.theme,
        frequency: t.frequency || 0,
        sentiment: (t.sentiment === 'positive' || t.sentiment === 'negative' || t.sentiment === 'neutral') 
          ? t.sentiment 
          : 'neutral',
        examples: Array.isArray(t.examples) ? t.examples.slice(0, 3) : [],
        description: t.description || '',
      }))
      .sort((a: ThemeInsight, b: ThemeInsight) => b.frequency - a.frequency)
      .slice(0, 6); // Top 6 themes

    // Get the latest entry for tracking
    const latestEntry = entries[0];
    
    // Save to cache
    await ThemeAnalysisModel.findOneAndUpdate(
      { userId },
      {
        userId,
        themes,
        lastEntryId: latestEntry._id.toString(),
        lastEntryDate: latestEntry.createdAt,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return themes;
  } catch (error) {
    console.error('Error extracting themes:', error);
    // Return empty array on error rather than throwing
    return [];
  }
}
