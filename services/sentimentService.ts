import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import type { SentimentResult } from '@/types';

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    const prompt = `Analyze the emotional tone of this journal entry:

"${text}"

Return a JSON object with:
- overall: 'positive', 'neutral', or 'negative'
- score: a number from 0 (very negative) to 1 (very positive)
- emotions: up to 3 specific emotion words (e.g., 'joy', 'anxiety', 'gratitude', 'sadness', 'hope')
- confidence: how confident you are in this analysis (0-1)

Focus on the writer's emotional state, not just the events described. Be nuanced and compassionate.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for consistent analysis
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate the response
    if (
      !result.overall ||
      typeof result.score !== 'number' ||
      !Array.isArray(result.emotions) ||
      typeof result.confidence !== 'number'
    ) {
      throw new Error('Invalid sentiment analysis response from OpenAI');
    }

    return {
      overall: result.overall as 'positive' | 'neutral' | 'negative',
      score: Math.max(0, Math.min(1, result.score)), // Clamp between 0-1
      emotions: result.emotions.slice(0, 3), // Max 3 emotions
      confidence: Math.max(0, Math.min(1, result.confidence)),
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Fallback to neutral sentiment on error
    return {
      overall: 'neutral',
      score: 0.5,
      emotions: [],
      confidence: 0,
    };
  }
}
