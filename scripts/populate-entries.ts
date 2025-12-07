import { connectDB } from '@/lib/db';
import EntryModel from '@/models/Entry';
import UserModel from '@/models/User';

const userId = '6934ce003f45fc9488d586c1';

// Diverse journal entries with varying themes and emotions
const journalTemplates = [
  {
    content: "Had an amazing morning walk in the park today. The fresh air and sunshine really helped clear my mind. I noticed the autumn leaves were starting to turn, creating this beautiful orange and gold tapestry. It reminded me to appreciate the small moments of beauty in everyday life. Feeling grateful for my health and the ability to enjoy nature.",
    sentiment: { score: 0.85, overall: 'positive' as const, confidence: 0.92, emotions: ['joy', 'gratitude'] },
    tags: ['nature', 'gratitude', 'wellness'],
  },
  {
    content: "Work was pretty stressful today. The deadline for the project is approaching and I'm feeling the pressure. Had a difficult conversation with a colleague about responsibilities. Trying to stay focused and not let the stress get to me. Need to remember to take breaks and not be too hard on myself.",
    sentiment: { score: 0.35, overall: 'negative' as const, confidence: 0.88, emotions: ['stress', 'frustration'] },
    tags: ['work', 'stress', 'relationships'],
  },
  {
    content: "Spent quality time with family this evening. We cooked dinner together and played board games. These simple moments are what life is really about. My niece told me about her day at school - her enthusiasm is so contagious. Went to bed feeling connected and content.",
    sentiment: { score: 0.90, overall: 'positive' as const, confidence: 0.94, emotions: ['joy', 'love', 'contentment'] },
    tags: ['family', 'joy', 'connection'],
  },
  {
    content: "Feeling a bit lost today. Not sure if I'm on the right path career-wise. Been thinking a lot about what I really want from life. Sometimes it feels like everyone else has it figured out except me. But I know comparison is the thief of joy. Tomorrow is a new day.",
    sentiment: { score: 0.45, overall: 'neutral' as const, confidence: 0.75, emotions: ['confusion', 'uncertainty'] },
    tags: ['career', 'uncertainty', 'self-reflection'],
  },
  {
    content: "Started reading that book everyone's been recommending. Three chapters in and I'm hooked! It's making me think differently about my daily habits. Decided to start a morning routine - wake up earlier, journal, exercise. Excited to see how this changes things over the next few weeks.",
    sentiment: { score: 0.80, overall: 'positive' as const, confidence: 0.89, emotions: ['excitement', 'motivation'] },
    tags: ['personal growth', 'habits', 'books'],
  },
  {
    content: "Rough day. Woke up tired and everything felt like an uphill battle. Coffee didn't help, traffic was terrible, and I forgot an important meeting. Just one of those days where nothing goes right. Ordered takeout and watched a comfort show. Sometimes you just need to reset and try again tomorrow.",
    sentiment: { score: 0.30, overall: 'negative' as const, confidence: 0.91, emotions: ['frustration', 'exhaustion'] },
    tags: ['bad day', 'frustration', 'self-care'],
  },
  {
    content: "Hit a new personal record at the gym today! All those early morning workouts are paying off. Feeling strong both physically and mentally. My trainer said my form has improved significantly. It's amazing how consistency compounds over time. Proud of myself for sticking with it.",
    sentiment: { score: 0.88, overall: 'positive' as const, confidence: 0.95, emotions: ['pride', 'accomplishment'] },
    tags: ['fitness', 'achievement', 'discipline'],
  },
  {
    content: "Had a deep conversation with an old friend I haven't talked to in months. We caught up on life, shared our struggles and wins. It's comforting to know that even when life gets busy, true friendships remain. Made a promise to keep in touch more regularly. Relationships need nurturing.",
    sentiment: { score: 0.82, overall: 'positive' as const, confidence: 0.90, emotions: ['warmth', 'connection'] },
    tags: ['friendship', 'connection', 'communication'],
  },
  {
    content: "Feeling anxious about the upcoming presentation at work. Keep rehearsing in my head but worried I'll forget something important. Trying to use breathing exercises to calm down. Reminded myself that I've prepared well and I know the material. The anticipation is often worse than the actual event.",
    sentiment: { score: 0.40, overall: 'negative' as const, confidence: 0.85, emotions: ['anxiety', 'worry'] },
    tags: ['anxiety', 'work', 'public speaking'],
  },
  {
    content: "Beautiful sunset tonight. Stood on the balcony for 20 minutes just watching the sky change colors. Pink, orange, purple - like a painting. These moments of pause are so important. Made me realize I've been too focused on productivity and not enough on just being present.",
    sentiment: { score: 0.78, overall: 'positive' as const, confidence: 0.87, emotions: ['peace', 'awe'] },
    tags: ['mindfulness', 'nature', 'reflection'],
  },
  {
    content: "Tried cooking a new recipe today and it turned out better than expected! There's something therapeutic about following a recipe and creating something with your hands. The kitchen smelled amazing. Invited a neighbor over to share the meal - spontaneous connections are the best kind.",
    sentiment: { score: 0.85, overall: 'positive' as const, confidence: 0.91, emotions: ['satisfaction', 'creativity'] },
    tags: ['cooking', 'creativity', 'community'],
  },
  {
    content: "Struggling with motivation lately. Feel like I'm just going through the motions. Need to reconnect with my why - what drives me, what excites me. Maybe it's time for a change, or maybe I just need a break. Hard to tell sometimes. Writing this out helps clarify my thoughts a bit.",
    sentiment: { score: 0.48, overall: 'neutral' as const, confidence: 0.78, emotions: ['apathy', 'contemplation'] },
    tags: ['motivation', 'burnout', 'self-reflection'],
  },
  {
    content: "Volunteered at the community center today. It felt good to give back and help others. Met some inspiring people doing incredible work with limited resources. Reminded me of the privilege I have and the importance of using it to make a positive impact. Definitely want to do this more often.",
    sentiment: { score: 0.87, overall: 'positive' as const, confidence: 0.93, emotions: ['fulfillment', 'gratitude'] },
    tags: ['volunteering', 'gratitude', 'community'],
  },
  {
    content: "Unexpected bill came in today and it's stressing me out. Money worries always make everything else feel heavier. Need to look at my budget and figure out where I can cut back. Trying not to panic and take it one step at a time. Financial stress is real but I'll figure it out.",
    sentiment: { score: 0.32, overall: 'negative' as const, confidence: 0.89, emotions: ['stress', 'worry'] },
    tags: ['finances', 'stress', 'planning'],
  },
  {
    content: "Meditated for 15 minutes this morning. Mind was racing at first but eventually settled into a peaceful rhythm. Noticed my breath, noticed my thoughts without judgment. It's a practice, not perfection. Even these small moments of stillness make a difference in how I approach the day. Starting to become a habit.",
    sentiment: { score: 0.75, overall: 'positive' as const, confidence: 0.86, emotions: ['calm', 'mindfulness'] },
    tags: ['meditation', 'mindfulness', 'mental health'],
  },
];

const timeOfDayOptions = ['morning', 'afternoon', 'evening', 'night'] as const;

// Sample voice transcripts for the 5 voice entries
const voiceTranscripts = [
  [
    { role: 'assistant' as const, content: 'Hi there! How are you feeling today?', timestamp: Date.now() },
    { role: 'user' as const, content: "Had an amazing morning walk in the park today. The fresh air and sunshine really helped clear my mind.", timestamp: Date.now() + 1000 },
    { role: 'assistant' as const, content: 'That sounds wonderful! Tell me more about what you noticed.', timestamp: Date.now() + 2000 },
    { role: 'user' as const, content: "I noticed the autumn leaves were starting to turn, creating this beautiful orange and gold tapestry. It reminded me to appreciate the small moments of beauty in everyday life. Feeling grateful for my health and the ability to enjoy nature.", timestamp: Date.now() + 3000 },
  ],
  [
    { role: 'assistant' as const, content: "How's your day going?", timestamp: Date.now() },
    { role: 'user' as const, content: "Work was pretty stressful today. The deadline for the project is approaching and I'm feeling the pressure.", timestamp: Date.now() + 1000 },
    { role: 'assistant' as const, content: "I hear you. What specific things are causing the most stress?", timestamp: Date.now() + 2000 },
    { role: 'user' as const, content: "Had a difficult conversation with a colleague about responsibilities. Trying to stay focused and not let the stress get to me. Need to remember to take breaks and not be too hard on myself.", timestamp: Date.now() + 3000 },
  ],
  [
    { role: 'assistant' as const, content: "What's on your mind today?", timestamp: Date.now() },
    { role: 'user' as const, content: "Spent quality time with family this evening. We cooked dinner together and played board games.", timestamp: Date.now() + 1000 },
    { role: 'assistant' as const, content: "That sounds lovely! How did it make you feel?", timestamp: Date.now() + 2000 },
    { role: 'user' as const, content: "These simple moments are what life is really about. My niece told me about her day at school - her enthusiasm is so contagious. Went to bed feeling connected and content.", timestamp: Date.now() + 3000 },
  ],
  [
    { role: 'assistant' as const, content: "How are things going?", timestamp: Date.now() },
    { role: 'user' as const, content: "Feeling a bit lost today. Not sure if I'm on the right path career-wise.", timestamp: Date.now() + 1000 },
    { role: 'assistant' as const, content: "It's okay to feel uncertain. What's been on your mind?", timestamp: Date.now() + 2000 },
    { role: 'user' as const, content: "Been thinking a lot about what I really want from life. Sometimes it feels like everyone else has it figured out except me. But I know comparison is the thief of joy. Tomorrow is a new day.", timestamp: Date.now() + 3000 },
  ],
  [
    { role: 'assistant' as const, content: "Tell me about your day!", timestamp: Date.now() },
    { role: 'user' as const, content: "Started reading that book everyone's been recommending. Three chapters in and I'm hooked!", timestamp: Date.now() + 1000 },
    { role: 'assistant' as const, content: "What's inspiring you about it?", timestamp: Date.now() + 2000 },
    { role: 'user' as const, content: "It's making me think differently about my daily habits. Decided to start a morning routine - wake up earlier, journal, exercise. Excited to see how this changes things over the next few weeks.", timestamp: Date.now() + 3000 },
  ],
];

async function populateEntries() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Verify user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error('❌ User not found with ID:', userId);
      process.exit(1);
    }
    console.log('✅ User found:', user.email);

    // Delete ALL existing entries for this user
    const deleteResult = await EntryModel.deleteMany({ userId });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing entries`);

    const entries = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Distribute 15 entries across 7 days (2-3 entries per day)
    const entriesPerDay = [2, 2, 3, 2, 2, 2, 2]; // Total = 15

    let templateIndex = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const numEntries = entriesPerDay[dayOffset];

      for (let i = 0; i < numEntries; i++) {
        const template = journalTemplates[templateIndex % journalTemplates.length];

        // Create date for this entry (going backwards from today)
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - (6 - dayOffset)); // 6 days ago to today

        // Set random time of day
        const hourRanges = {
          morning: [6, 11],
          afternoon: [12, 17],
          evening: [18, 21],
          night: [22, 23],
        };

        const timeOfDay = timeOfDayOptions[i % timeOfDayOptions.length];
        const [minHour, maxHour] = hourRanges[timeOfDay];
        const randomHour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
        const randomMinute = Math.floor(Math.random() * 60);

        entryDate.setHours(randomHour, randomMinute, 0, 0);

        // First 5 entries are voice, rest are text
        const isVoiceEntry = templateIndex < 5;

        const entry: any = {
          userId,
          content: template.content,
          sentiment: template.sentiment,
          tags: template.tags,
          metadata: {
            wordCount: template.content.split(' ').length,
            timeOfDay,
            entryType: isVoiceEntry ? ('voice' as const) : ('text' as const),
          },
          createdAt: entryDate,
          updatedAt: entryDate,
        };

        // Add fullTranscript for voice entries
        if (isVoiceEntry && voiceTranscripts[templateIndex]) {
          entry.metadata.fullTranscript = voiceTranscripts[templateIndex];
        }

        entries.push(entry);
        templateIndex++;
      }
    }

    // Sort entries by date (oldest first)
    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Insert all entries
    const result = await EntryModel.insertMany(entries);
    console.log(`✅ Created ${result.length} journal entries`);

    // Display summary
    console.log('\n📊 Summary by day:');
    const entriesByDay: { [key: string]: number } = {};
    entries.forEach(entry => {
      const dateKey = entry.createdAt.toLocaleDateString();
      entriesByDay[dateKey] = (entriesByDay[dateKey] || 0) + 1;
    });

    Object.entries(entriesByDay).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} entries`);
    });

    const voiceCount = entries.filter(e => e.metadata.entryType === 'voice').length;
    const textCount = entries.filter(e => e.metadata.entryType === 'text').length;
    console.log(`\n📝 Entry types:`);
    console.log(`  Voice entries: ${voiceCount}`);
    console.log(`  Text entries: ${textCount}`);

    console.log('\n✅ Database populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

populateEntries();
