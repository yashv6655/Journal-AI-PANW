# AI Journal Agent - Technical Documentation

## Overview

The AI Journal Agent is a full-stack web application that enables users to create journal entries through text or voice input, with AI-powered sentiment analysis, writing prompts, and emotional trend tracking.

## Technical Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Custom component library built on Radix UI primitives
- **Charts**: Chart.js for data visualization
- **Voice Integration**: Vapi SDK (@vapi-ai/web) for voice journaling

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js with email/password and OAuth providers
- **Database**: MongoDB with Mongoose ODM
- **AI Services**: OpenAI API (GPT-4o-mini) for sentiment analysis and prompt generation

### Infrastructure
- **Deployment**: Vercel
- **Database**: MongoDB Atlas
- **Environment**: Environment variables for configuration

## Architecture

### Application Structure

```
app/
├── (dashboard)/          # Protected dashboard routes
│   ├── dashboard/        # Main dashboard with stats
│   ├── entries/          # Entry management
│   └── summaries/        # AI-generated summaries
├── api/                  # API routes
│   ├── entries/          # Entry CRUD operations
│   ├── stats/            # Statistics and chart data
│   ├── writing-prompts/  # Dynamic writing prompts
│   └── vapi/             # Voice journaling webhooks
└── page.tsx              # Landing page

components/
├── dashboard/            # Dashboard-specific components
├── entries/              # Entry-related components
└── ui/                   # Reusable UI components

services/
├── sentimentService.ts   # OpenAI sentiment analysis
├── writingPromptService.ts # AI prompt generation
└── voiceJournalService.ts # Voice transcript processing

lib/
├── db.ts                 # MongoDB connection
├── openai.ts             # OpenAI client
├── vapi.ts               # Vapi client
└── utils.ts              # Utility functions
```

## Key Features

### 1. Journal Entry Management
- Text-based journal entries with rich text support
- Voice journaling via Vapi integration
- Automatic sentiment analysis on all entries
- Tag-based organization
- Daily prompt system with cooldown periods

### 2. AI-Powered Writing Assistance
- Real-time writing prompts triggered by word count thresholds
- Completion detection to identify well-rounded entries
- Follow-up questions during inactivity periods
- Contextual prompt generation based on entry content

### 3. Voice Journaling
- Voice-to-text transcription via Vapi
- AI assistant guides conversation with daily prompts
- Automatic call ending based on conversation completion
- Full transcript storage with user content extraction
- 6-minute maximum call duration

### 4. Analytics & Insights
- Emotional trend visualization over time periods
- Streak tracking (daily journaling consistency)
- Entry statistics (total entries, word counts)
- Time period filters (weekly, monthly, 3/6/12 months)

### 5. User Experience
- Responsive design for mobile and desktop
- Real-time UI updates
- Optimistic UI updates for better perceived performance
- Error handling with user-friendly messages

## Design Decisions

### 1. Next.js App Router
**Rationale**: Modern routing with server components, improved performance, and better developer experience. App Router provides built-in layouts, loading states, and error boundaries.

### 2. MongoDB with Mongoose
**Rationale**: Flexible schema for journal entries with varying metadata. Mongoose provides type safety, validation, and middleware hooks for data consistency.

### 3. OpenAI GPT-4o-mini
**Rationale**: Cost-effective model for sentiment analysis and prompt generation. Provides sufficient quality for journaling use case while maintaining low API costs.

### 4. Client-Side Voice Processing
**Rationale**: Voice journaling processes transcripts client-side to reduce server load and improve response times. Full transcript stored for context, but only user content used for sentiment analysis.

### 5. Real-Time Prompt System
**Rationale**: Writing prompts appear dynamically based on word count and inactivity. Prevents overwhelming users while providing timely guidance.

### 6. Dual Entry Modes
**Rationale**: Text and voice modes serve different user preferences. Voice mode enables hands-free journaling and natural conversation flow.

### 7. Sentiment Analysis on User Content Only
**Rationale**: For voice entries, sentiment analysis uses only extracted user speech, excluding assistant questions. Ensures accurate emotional analysis of user's actual thoughts.

### 8. Chart Data Normalization
**Rationale**: Chart displays all days in selected period, with null values for days without entries. Prevents misleading visualizations and shows gaps in journaling activity.

## API Structure

### Entry Management
- `POST /api/entries` - Create new entry
- `GET /api/entries` - List entries with pagination
- `GET /api/entries/[id]` - Get single entry
- `DELETE /api/entries/[id]` - Delete entry

### Statistics
- `GET /api/stats` - Get user statistics and chart data
  - Query params: `period` (weekly, monthly, 3months, 6months, 1year)

### Writing Prompts
- `GET /api/writing-prompts` - Generate writing prompt
  - Query params: `type` (follow-up, completion-check)
  - Body: `content`, `sentiment` (optional)

### Voice Journaling
- `POST /api/vapi/webhook` - Vapi webhook endpoint (optional server-side processing)

## Database Schema

### User Model
```typescript
{
  _id: ObjectId
  email: string (unique, indexed)
  name: string
  password: string (hashed)
  stats: {
    totalEntries: number
    currentStreak: number
    longestStreak: number
  }
  createdAt: Date
  updatedAt: Date
}
```

### Entry Model
```typescript
{
  _id: ObjectId
  userId: string (indexed)
  content: string (required)
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative'
    score: number (0-1)
    emotions: string[]
    confidence: number (0-1)
  }
  metadata: {
    wordCount: number
    prompt: string
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    entryType: 'text' | 'voice'
    fullTranscript: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: number
    }>
  }
  tags: string[] (indexed)
  createdAt: Date (indexed)
  updatedAt: Date
}
```

### Daily Prompt Model
```typescript
{
  _id: ObjectId
  userId: string (indexed)
  date: string (YYYY-MM-DD, indexed)
  prompt: string
  answeredAt: Date
  createdAt: Date
}
```

## Security Considerations

### Authentication
- NextAuth.js handles session management
- Password hashing via bcrypt
- CSRF protection built into NextAuth
- Secure cookie configuration

### API Security
- Rate limiting on entry creation (20 requests/minute)
- Session validation on all protected routes
- Input validation and sanitization
- MongoDB injection prevention via Mongoose

### Data Privacy
- User data isolated by userId
- No data sharing between users
- OpenAI API calls do not store user data
- Environment variables for sensitive keys

### Voice Journaling
- Vapi public key used client-side only
- Private key stored server-side for webhooks
- Transcripts stored in user's own database
- No third-party transcript storage

## Performance Optimizations

### Frontend
- Server components for initial page load
- Client components only where interactivity needed
- Optimistic UI updates
- Debounced API calls for writing prompts
- Chart data caching with refresh intervals

### Backend
- Database indexing on frequently queried fields
- Lean queries for read operations
- Parallel processing (sentiment analysis + entry creation)
- Connection pooling for MongoDB

### API
- Rate limiting to prevent abuse
- Efficient database queries with projections
- Pagination for entry lists
- Chart data aggregation at database level

## Environment Variables

Required environment variables:

```
MONGODB_URI              # MongoDB connection string
NEXTAUTH_SECRET          # NextAuth session secret
NEXTAUTH_URL             # Application URL
OPENAI_API_KEY           # OpenAI API key
NEXT_PUBLIC_VAPI_PUBLIC_KEY  # Vapi public key
```

## Deployment

### Vercel Deployment
1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push to main branch

### Database Setup
1. Create MongoDB Atlas cluster
2. Configure IP whitelist
3. Create database user
4. Set connection string in environment variables

## Future Enhancements

- Export entries to PDF/JSON
- Advanced search and filtering
- Entry templates
- Mobile app (React Native)
- Offline support with sync
- Custom AI model fine-tuning
- Multi-language support
