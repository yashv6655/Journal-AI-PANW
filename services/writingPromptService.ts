import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import type { SentimentResult, WritingPromptResponse } from '@/types';

// Fallback questions if AI generation fails
const FALLBACK_QUESTIONS = {
  positive: [
    "What made this moment feel so good?",
    "How can you create more moments like this?",
    "What does this tell you about what you value?",
  ],
  neutral: [
    "What's beneath the surface of these thoughts?",
    "What would you tell a friend who wrote this?",
    "What's one thing you're not saying here?",
  ],
  negative: [
    "What would help you feel more supported right now?",
    "What's one small step you could take to feel better?",
    "What strengths are you drawing on to get through this?",
  ],
};

export async function analyzeEntryCompleteness(
  content: string,
  sentiment: SentimentResult
): Promise<{ isComplete: boolean; message?: string }> {
  try {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    
    // Minimum word count for completion consideration
    if (wordCount < 50) {
      return { isComplete: false };
    }

    // Use first 1000 characters for context
    const contentPreview = content.substring(0, 1000);
    const emotions = sentiment.emotions?.join(', ') || 'various emotions';
    
    const aiPrompt = `The user is writing a journal entry. Here's what they've written:

"${contentPreview}"

Based on this content, I've detected:
- Overall sentiment: ${sentiment.overall}
- Emotions: ${emotions}
- Sentiment score: ${sentiment.score.toFixed(2)}
- Word count: ${wordCount}

Analyze if this entry is well-rounded and complete. Consider:
1. Does it have sufficient depth and reflection?
2. Does it explore multiple thoughts or aspects?
3. Does it show emotional awareness?
4. Does it feel like a complete thought or story?
5. Is it substantial enough to be meaningful?

Respond with ONLY one of these two options:
- If the entry is well-rounded and complete: "COMPLETE: Your entry looks well-rounded and complete. Ready to save!"
- If the entry needs more development: "INCOMPLETE"

Return only your response, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
        { role: 'user', content: aiPrompt },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const result = response.choices[0].message.content?.trim() || '';
    
    if (result.startsWith('COMPLETE:')) {
      const message = result.replace('COMPLETE:', '').trim();
      return { isComplete: true, message: message || 'Your entry looks well-rounded and complete. Ready to save!' };
    }

    return { isComplete: false };
  } catch (error) {
    console.error('Error analyzing entry completeness:', error);
    // On error, default to not complete
    return { isComplete: false };
  }
}

export async function generateWritingPrompt(
  content: string,
  sentiment: SentimentResult,
  type: 'follow-up' | 'completion-check' = 'follow-up'
): Promise<WritingPromptResponse> {
  // Handle completion check
  if (type === 'completion-check') {
    const completeness = await analyzeEntryCompleteness(content, sentiment);
    if (completeness.isComplete) {
      return {
        type: 'completion',
        message: completeness.message || 'Your entry looks well-rounded and complete. Ready to save!',
        sentiment,
      };
    }
    return { type: null };
  }

  // Handle follow-up question generation
  try {
    // Use first 500 characters for context (to keep token usage reasonable)
    const contentPreview = content.substring(0, 500);
    const emotions = sentiment.emotions?.join(', ') || 'various emotions';
    
    const aiPrompt = `The user is writing a journal entry. Here's what they've written so far:

"${contentPreview}"

Based on this content, I've detected:
- Overall sentiment: ${sentiment.overall}
- Emotions: ${emotions}
- Sentiment score: ${sentiment.score.toFixed(2)} (0 = very negative, 1 = very positive)

Generate ONE thoughtful, open-ended question (1-2 sentences max) that will help them reflect deeper on what they're writing. The question should:
- Be empathetic and warm
- Build on what they've already written
- Encourage deeper self-reflection
- Match the emotional tone (if they're struggling, be supportive; if they're celebrating, help them explore why it matters)
- Not be generic - make it specific to their content
- Help them discover something new about themselves

Return only the question, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
        { role: 'user', content: aiPrompt },
      ],
      temperature: 0.8, // Higher temperature for creative, personalized questions
      max_tokens: 100,
    });

    const question = response.choices[0].message.content?.trim() || '';

    if (!question) {
      throw new Error('Empty question from OpenAI');
    }

    return {
      type: 'question',
      question,
      sentiment,
    };
  } catch (error) {
    console.error('Error generating writing prompt:', error);
    // Return fallback question based on sentiment
    const fallbacks = FALLBACK_QUESTIONS[sentiment.overall] || FALLBACK_QUESTIONS.neutral;
    const fallbackQuestion = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return {
      type: 'question',
      question: fallbackQuestion,
      sentiment,
    };
  }
}
