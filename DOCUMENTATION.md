# AI Journal Agent - Technical Documentation

## Overview

Full-stack web application for journaling with AI-powered sentiment analysis, writing prompts, and emotional trend tracking. Supports text and voice entry modes.

## Technical Stack

**Frontend**: Next.js 16, TypeScript, Tailwind CSS, Chart.js, Vapi SDK
**Backend**: Next.js API Routes, Node.js
**Database**: MongoDB
**Authentication**: NextAuth.js
**AI Services**: OpenAI GPT-4o-mini, Vapi
**Deployment**: Vercel, MongoDB Atlas
**Development Tools**: Claude Code, Cursor

## Design Decisions

### Next.js App Router
Modern routing with server components, built-in layouts, and improved performance. Enables server-side rendering for faster initial loads while maintaining client-side interactivity.

### MongoDB
Flexible schema accommodates varying entry metadata (text/voice entries, transcripts, sentiment data). Document-based structure suits journal entries with nested sentiment and metadata objects.

### OpenAI GPT-4o-mini
Cost-effective model providing sufficient quality for sentiment analysis and prompt generation. Balances accuracy with API costs for production use.

### Dual Entry Modes
Text and voice modes serve different user preferences. Voice mode uses Vapi for natural conversation flow, with client-side transcript processing to reduce server load.

### Contextual Prompt Generation
Daily prompts generated from last 3 entries, considering sentiment, emotions, and user's journaling goals. Ensures personalized, relevant prompts that build on previous reflections.

### Real-Time Writing Assistance
Dynamic prompts triggered by word count thresholds and inactivity detection. Completion detection identifies well-rounded entries. Prevents overwhelming users while providing timely guidance.

### Sentiment Analysis Strategy
For voice entries, analysis uses only extracted user speech (excluding assistant questions) to ensure accurate emotional analysis of user's actual thoughts.

### Caching Strategy
AI analysis results (themes, correlations, topics) cached in MongoDB and invalidated only when new entries are created. Reduces API calls and improves response times.

## Core Features

- **Journal Entries**: Text and voice entry modes with automatic sentiment analysis
- **AI Writing Prompts**: Real-time contextual prompts based on entry content and history
- **Voice Journaling**: Vapi integration with AI assistant, automatic call ending, full transcript storage
- **Analytics**: Emotional trend charts, streak tracking, entry statistics with time period filters
- **AI Insights**: Theme extraction, correlation detection, goal-based prompt generation

## Database Schema

**User**: email, name, password (hashed), stats (totalEntries, streaks), preferences (journalingGoal)  
**Entry**: userId, content, sentiment (overall, score, emotions, confidence), metadata (wordCount, prompt, timeOfDay, entryType, fullTranscript), tags, timestamps  
**DailyPrompt**: userId, date, prompt, answeredAt  
**Analysis Caches**: ThemeAnalysis, CorrelationAnalysis, TopicAnalysis (cached AI results with invalidation)

## Security

- NextAuth.js session management with secure cookies
- Rate limiting on API endpoints
- User data isolation by userId
- Environment variables for sensitive keys
- Input validation and MongoDB injection prevention

## Future Enhancements
- More visualizations
- More Personable Messages and Prompts
- Less reliability on OpenAI
- Reminder emails regarding streak loss or reminder to come back to platform for user retention
- Enable metrics for the website, PostHog or Vercel to see user interactions
