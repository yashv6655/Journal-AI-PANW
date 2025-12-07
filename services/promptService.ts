import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import EntryModel from '@/models/Entry';
import DailyPromptModel from '@/models/DailyPrompt';
import UserModel from '@/models/User';
import { connectDB } from '@/lib/db';
import type { PromptResponse } from '@/types';

// Fallback prompts for new users or when AI fails
const FALLBACK_PROMPTS = [
  "What's one thing you're grateful for today?",
  "Describe a moment today when you felt most like yourself.",
  "What's taking up the most mental space for you right now?",
  "What gave you energy today?",
  "What's one thing you're looking forward to this week?",
  "How did you take care of yourself today?",
  "What would you tell a friend who's going through what you're going through?",
  "What's something you learned about yourself recently?",
];

// Get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Check if 12 hours have passed since answeredAt
function isCooldownActive(answeredAt: Date): boolean {
  const now = new Date();
  const cooldownMs = 12 * 60 * 60 * 1000; // 12 hours
  const timeSinceAnswer = now.getTime() - answeredAt.getTime();
  return timeSinceAnswer < cooldownMs;
}

// Calculate when cooldown expires
function getCooldownUntil(answeredAt: Date): Date {
  const cooldownMs = 12 * 60 * 60 * 1000; // 12 hours
  return new Date(answeredAt.getTime() + cooldownMs);
}

export async function getDailyPrompt(
  userId: string
): Promise<PromptResponse> {
  try {
    await connectDB();

    const today = getTodayDateString();

    // Check if daily prompt exists for today
    const existingPrompt = await DailyPromptModel.findOne({
      userId,
      date: today,
    }).lean();

    if (existingPrompt) {
      // Prompt exists for today
      if (existingPrompt.answeredAt) {
        // User has answered - check cooldown
        const answeredAt = new Date(existingPrompt.answeredAt);
        if (isCooldownActive(answeredAt)) {
          // Cooldown is active
          return {
            prompt: existingPrompt.prompt,
            answered: true,
            cooldownUntil: getCooldownUntil(answeredAt),
            canAnswer: false,
            context: null,
          };
        } else {
          // Cooldown expired - generate new prompt
          // Delete old prompt and create new one
          await DailyPromptModel.deleteOne({ _id: existingPrompt._id });
          return generateNewDailyPrompt(userId);
        }
      } else {
        // Prompt exists but not answered yet
        return {
          prompt: existingPrompt.prompt,
          answered: false,
          canAnswer: true,
          context: null,
        };
      }
    } else {
      // No prompt for today - generate new one
      return generateNewDailyPrompt(userId);
    }
  } catch (error) {
    console.error('Error getting daily prompt:', error);
    // Fallback on error
    const randomPrompt =
      FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    return {
      prompt: randomPrompt,
      answered: false,
      canAnswer: true,
      context: null,
    };
  }
}

async function generateNewDailyPrompt(
  userId: string
): Promise<PromptResponse> {
  try {
    await connectDB();

    const today = getTodayDateString();

    // Fetch user to get journaling goal
    const user = await UserModel.findById(userId).lean();
    const journalingGoal = user?.preferences?.journalingGoal;

    // Fetch last 3 entries for context
    const recentEntries = await EntryModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    let prompt: string;
    let context: string | null = null;

    // If no entries, use fallback prompt (but still consider goal)
    if (recentEntries.length === 0) {
      if (journalingGoal) {
        // Generate goal-based prompt even without entries
        const goalDescriptions: { [key: string]: string } = {
          stress_relief: 'The user wants to use journaling for stress relief and managing anxiety.',
          self_discovery: 'The user wants to use journaling for self-discovery and understanding themselves better.',
          habit_building: 'The user wants to use journaling to build consistent habits and track progress.',
        };

        const aiPrompt = `Generate ONE thoughtful, open-ended question to help the user start their journaling journey. 

User's journaling goal: ${goalDescriptions[journalingGoal] || journalingGoal}

The question should:
- Be empathetic and warm
- Align with their goal of ${journalingGoal.replace('_', ' ')}
- Encourage deeper self-reflection
- Be concise (1-2 sentences max)
- Help them begin their journaling practice

Return only the question, nothing else.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
            { role: 'user', content: aiPrompt },
          ],
          temperature: 0.8,
          max_tokens: 100,
        });

        prompt = response.choices[0].message.content?.trim() || '';
        if (!prompt) {
          prompt = FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
        }
        context = 'Based on your journaling goals';
      } else {
        prompt = FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
      }
    } else {
      // Generate contextual prompt with both entries and goals
      const entrySummaries = recentEntries.map((entry, i) => {
        const sentiment = entry.sentiment?.overall || 'unknown';
        const emotions = entry.sentiment?.emotions?.join(', ') || 'none';
        const preview = entry.content.substring(0, 150);
        return `Entry ${i + 1} (${sentiment}, emotions: ${emotions}): "${preview}..."`;
      });

      const contextSummary = entrySummaries.join('\n\n');

      const goalDescriptions: { [key: string]: string } = {
        stress_relief: 'The user wants to use journaling for stress relief. If entries mention stress, anxiety, or overwhelm, focus prompts on coping strategies, moments of calm, or self-care.',
        self_discovery: 'The user wants to use journaling for self-discovery. Focus prompts on understanding patterns, exploring identity, or reflecting on personal growth.',
        habit_building: 'The user wants to use journaling to build consistent habits. Focus prompts on progress, routines, or what helps them stay consistent.',
      };

      const goalContext = journalingGoal 
        ? `\n\nUser's journaling goal: ${goalDescriptions[journalingGoal] || journalingGoal}\nWhen generating the prompt, consider both their recent entries AND their stated goal.`
        : '';

      const aiPrompt = `Based on these recent journal entries:

${contextSummary}${goalContext}

Generate ONE thoughtful, open-ended question to help the user reflect today. The question should:
- Be empathetic and warm
- Build on themes from their recent entries${journalingGoal ? ' while aligning with their journaling goal' : ''}
- Encourage deeper self-reflection
- Be concise (1-2 sentences max)
- Not repeat previous questions

Return only the question, nothing else.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: JOURNALING_SYSTEM_PROMPT },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.8,
        max_tokens: 100,
      });

      prompt = response.choices[0].message.content?.trim() || '';
      if (!prompt) {
        throw new Error('Empty prompt from OpenAI');
      }
      context = journalingGoal 
        ? 'Based on your recent reflections and journaling goals'
        : 'Based on your recent reflections';
    }

    // Save daily prompt
    const dailyPrompt = new DailyPromptModel({
      userId,
      prompt,
      date: today,
    });
    await dailyPrompt.save();

    return {
      prompt,
      answered: false,
      canAnswer: true,
      context,
    };
  } catch (error) {
    console.error('Error generating new daily prompt:', error);
    // Fallback on error
    const randomPrompt =
      FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    return {
      prompt: randomPrompt,
      answered: false,
      canAnswer: true,
      context: null,
    };
  }
}

// Legacy function for backward compatibility (now uses getDailyPrompt)
export async function generateContextualPrompt(
  userId: string
): Promise<{ prompt: string; context: string | null }> {
  const dailyPrompt = await getDailyPrompt(userId);
  return {
    prompt: dailyPrompt.prompt,
    context: dailyPrompt.context || null,
  };
}
