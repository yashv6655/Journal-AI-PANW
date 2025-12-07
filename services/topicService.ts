import { openai, JOURNALING_SYSTEM_PROMPT } from '@/lib/openai';
import EntryModel from '@/models/Entry';
import TopicAnalysisModel from '@/models/TopicAnalysis';
import { connectDB } from '@/lib/db';

export interface Topic {
  name: string;
  description: string;
  prompts: string[];
  relevance: number; // 0-1, how relevant to user
  category: 'struggle' | 'growth' | 'general';
}

// Curated hardcoded topics with prompts
const CURATED_TOPICS: Topic[] = [
  {
    name: 'Gratitude',
    description: 'Cultivate appreciation and positive thinking',
    prompts: [
      "What's one thing you're grateful for today?",
      "Who in your life makes you feel seen and heard?",
      "What's a small moment from today that brought you joy?",
      "What's something you take for granted that others might not have?",
      "How has someone helped you recently, and how did it make you feel?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Fitness & Health',
    description: 'Reflect on your physical and mental wellness',
    prompts: [
      "How did you move your body today, and how did it make you feel?",
      "What's one healthy choice you made today?",
      "How does exercise or movement affect your mood?",
      "What's your relationship with your body telling you?",
      "What would help you feel more energized?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Fun & Joy',
    description: 'Celebrate moments of happiness and play',
    prompts: [
      "What made you laugh or smile today?",
      "When was the last time you felt truly carefree?",
      "What activity makes you lose track of time?",
      "What's something fun you want to do this week?",
      "How do you bring more playfulness into your life?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Festivals & Celebrations',
    description: 'Reflect on special occasions and traditions',
    prompts: [
      "What festivals or holidays are meaningful to you and why?",
      "How do you celebrate important moments in your life?",
      "What traditions do you want to create or continue?",
      "What's a celebration you're looking forward to?",
      "How do you honor special days or seasons?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Christmas & Holidays',
    description: 'Reflect on the holiday season and its meaning',
    prompts: [
      "What does the holiday season mean to you?",
      "What's your favorite holiday memory?",
      "How do you want to celebrate this year?",
      "What traditions bring you comfort during the holidays?",
      "How can you find peace and joy during this season?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Self-Reflection',
    description: 'Explore your thoughts and feelings',
    prompts: [
      "What's taking up the most mental space for you right now?",
      "What would you tell a friend who's going through what you're going through?",
      "What's something you learned about yourself recently?",
      "What patterns do you notice in your thoughts or behaviors?",
      "How have you grown or changed recently?",
    ],
    relevance: 1,
    category: 'general',
  },
  {
    name: 'Personal Growth',
    description: 'Focus on development and improvement',
    prompts: [
      "What's one small step you could take to feel better?",
      "How did you take care of yourself today?",
      "What's one thing you're looking forward to this week?",
      "What's a goal you're working toward?",
      "How can you be kinder to yourself?",
    ],
    relevance: 1,
    category: 'general',
  },
];

export async function generateDynamicTopics(
  userId: string,
  forceRefresh: boolean = false
): Promise<Topic[]> {
  try {
    await connectDB();

    // Check cache first (unless force refresh)
    // Cache is automatically invalidated when new entries are created,
    // so we can trust it if it exists without querying the database
    if (!forceRefresh) {
      const cached = await TopicAnalysisModel.findOne({ userId }).lean();
      if (cached && cached.topics && cached.topics.length > 0) {
        // Cache exists and is valid - return it immediately
        // No need to check database - cache is invalidated on new entry creation
        return cached.topics as Topic[];
      }
    }

    // Fetch last 15 entries for analysis
    const recentEntries = await EntryModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // Always include curated topics
    // If user has fewer than 5 entries, return only curated topics (but still cache them)
    if (recentEntries.length < 5) {
      // Cache curated topics so we don't process them every time
      await TopicAnalysisModel.findOneAndUpdate(
        { userId },
        {
          userId,
          topics: CURATED_TOPICS,
          lastEntryId: undefined,
          lastEntryDate: new Date(),
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      return CURATED_TOPICS;
    }

    // Analyze entries for patterns
    const entryAnalysis = recentEntries.map((entry) => {
      const sentiment = entry.sentiment?.overall || 'neutral';
      const emotions = entry.sentiment?.emotions || [];
      const preview = entry.content.substring(0, 200);
      const date = new Date(entry.createdAt).toLocaleDateString();
      return `Entry from ${date} (${sentiment}, emotions: ${emotions.join(', ')}): "${preview}..."`;
    }).join('\n\n---\n\n');

    const aiPrompt = `Analyze these journal entries to identify the user's current struggles, patterns, and areas for growth:

${entryAnalysis}

Based on this analysis, generate 3-5 personalized topics with prompts. Each topic should:
1. Address a specific struggle, pattern, or growth area you identified
2. Be empathetic and supportive
3. Include 2-3 thoughtful prompts that help the user reflect on that topic

Return a JSON object with this structure:
{
  "topics": [
    {
      "name": "Topic name (e.g., 'Managing Work Stress')",
      "description": "Brief description of why this topic is relevant",
      "prompts": ["Prompt 1", "Prompt 2", "Prompt 3"],
      "category": "struggle" or "growth" or "general"
    }
  ]
}

Focus on:
- Recurring negative emotions or struggles
- Frequently mentioned topics (work, relationships, health, etc.)
- Missing positive themes (if they never write about gratitude, suggest it)
- Areas where they could benefit from reflection

Be specific and personal - avoid generic topics.`;

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

    if (!result.topics || !Array.isArray(result.topics)) {
      throw new Error('Invalid topic generation response');
    }

    // Validate and format topics
    const topics: Topic[] = result.topics
      .slice(0, 5) // Max 5 topics
      .map((topic: any) => ({
        name: topic.name || 'Reflection',
        description: topic.description || '',
        prompts: Array.isArray(topic.prompts) ? topic.prompts.slice(0, 3) : [],
        relevance: typeof topic.relevance === 'number' ? topic.relevance : 0.8,
        category: ['struggle', 'growth', 'general'].includes(topic.category)
          ? topic.category
          : 'general',
      }))
      .filter((topic: Topic) => topic.prompts.length > 0);

    // If we got valid topics, merge with curated topics
    if (topics.length > 0) {
      // Add relevance scores based on category
      const dynamicTopics = topics.map((topic) => ({
        ...topic,
        relevance: topic.category === 'struggle' ? 0.9 : topic.relevance,
      }));

      // Merge: dynamic topics first (more relevant), then curated topics
      // Remove duplicates by name
      const allTopics = [...dynamicTopics];
      const dynamicTopicNames = new Set(dynamicTopics.map((t) => t.name.toLowerCase()));
      
      CURATED_TOPICS.forEach((curatedTopic) => {
        if (!dynamicTopicNames.has(curatedTopic.name.toLowerCase())) {
          allTopics.push(curatedTopic);
        }
      });

      // Get the latest entry info for cache
      const latestEntry = recentEntries.length > 0 ? recentEntries[0] : null;
      const latestEntryId = latestEntry?._id?.toString();
      const latestEntryDate = latestEntry?.createdAt
        ? new Date(latestEntry.createdAt)
        : new Date();

      // Save to cache
      await TopicAnalysisModel.findOneAndUpdate(
        { userId },
        {
          userId,
          topics: allTopics,
          lastEntryId: latestEntryId || undefined,
          lastEntryDate: latestEntryDate,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return allTopics;
    }

    // If no valid topics generated, fall back to curated topics and cache them
    const latestEntry = recentEntries.length > 0 ? recentEntries[0] : null;
    const latestEntryId = latestEntry?._id?.toString();
    const latestEntryDate = latestEntry?.createdAt
      ? new Date(latestEntry.createdAt)
      : new Date();

    // Save curated topics to cache
    await TopicAnalysisModel.findOneAndUpdate(
      { userId },
      {
        userId,
        topics: CURATED_TOPICS,
        lastEntryId: latestEntryId || undefined,
        lastEntryDate: latestEntryDate,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return CURATED_TOPICS;
    } catch (error) {
      console.error('Error generating dynamic topics:', error);
      
      // Try to return cached topics on error
      const cached = await TopicAnalysisModel.findOne({ userId }).lean();
      if (cached && cached.topics.length > 0) {
        return cached.topics as Topic[];
      }
      
      // Fallback to curated topics if cache also fails
      return CURATED_TOPICS;
    }
  }
