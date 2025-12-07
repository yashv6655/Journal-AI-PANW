import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import EntryModel from '@/models/Entry';
import { connectDB } from '@/lib/db';
import type { WeeklySummary } from '@/types';

export async function generateWeeklySummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Omit<WeeklySummary, '_id' | 'createdAt'>> {
  try {
    await connectDB();

    // Fetch all entries in the date range
    const entries = await EntryModel.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (entries.length === 0) {
      throw new Error('No entries found for this period');
    }

    // Create a summary of entries for AI analysis
    const entrySummaries = entries.map((entry, i) => {
      const date = new Date(entry.createdAt).toLocaleDateString();
      const sentiment = entry.sentiment?.overall || 'unknown';
      const emotions = entry.sentiment?.emotions?.join(', ') || 'none';
      const preview = entry.content.substring(0, 300);
      return `Entry ${i + 1} (${date}, ${sentiment}, emotions: ${emotions}):\n"${preview}${entry.content.length > 300 ? '...' : ''}"`;
    });

    const aiPrompt = `You are reviewing a week of journal entries. Analyze these ${entries.length} entries and provide a thoughtful weekly reflection:

${entrySummaries.join('\n\n---\n\n')}

Provide a response in JSON format with:
1. "summary": A gentle 2-3 sentence summary of the week's emotional themes
2. "insights": An array of 3-5 specific observations or patterns you noticed (as strings). These should identify concrete correlations, such as:
   - "You mentioned feeling most energized on days you had a morning walk"
   - "On days you wrote about work stress, your entries were more negative"
   - "You wrote about creative ideas more frequently during weeks with exercise"
   - "Your mood improved significantly after entries mentioning time with friends"
   Include specific examples from the entries when possible.
3. "correlations": An array of 2-3 specific correlations you discovered (as strings), formatted like:
   - "On days you mentioned [activity/event], your entries were [X]% more [positive/negative]"
   - "You felt most [emotion] when [specific context or activity]"
   - "There's a pattern: [specific observation with concrete example]"
4. "reflection": One encouraging question or reflection for the coming week

Focus on:
- Emotional patterns and themes
- Specific correlations between activities, events, and emotions
- Connections between events and feelings with concrete examples
- Progress or growth moments
- Self-care and coping strategies observed
- Non-obvious patterns that help the user understand themselves better

Keep the tone warm, non-judgmental, and empowering. Be specific and concrete in your observations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
        { role: 'user', content: aiPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Combine summary and reflection into content
    let content = `${result.summary}\n\n`;
    
    // Add correlations section if available
    if (result.correlations && Array.isArray(result.correlations) && result.correlations.length > 0) {
      content += `Key Connections:\n${result.correlations.map((c: string) => `• ${c}`).join('\n')}\n\n`;
    }
    
    content += result.reflection || '';

    return {
      userId,
      type: 'weekly',
      period: {
        start: startDate,
        end: endDate,
      },
      content: content.trim(),
      insights: Array.isArray(result.insights) ? result.insights : [],
      entriesAnalyzed: entries.length,
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}
