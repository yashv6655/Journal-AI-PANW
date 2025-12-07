# Journal AI - AI-Powered Journaling Companion

Your empathetic AI companion that transforms journaling from a blank page into a conversation.

## Features ✨

- **AI-Powered Prompts**: Context-aware questions tailored to your recent entries
- **Sentiment Analysis**: Real-time emotional feedback on every entry
- **Emotional Trends**: Visualize your mood patterns over time
- **Weekly Summaries**: AI-generated insights about your journaling journey
- **Streak Tracking**: Stay motivated with daily streak counters
- **Privacy First**: Secure encryption and transparent AI processing

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB Atlas
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (already configured)
- OpenAI API key (already configured)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables** in `.env.local`:
   - `MONGODB_URI` - MongoDB connection string
   - `NEXTAUTH_SECRET` - NextAuth session secret
   - `NEXTAUTH_URL` - Your app URL (e.g., http://localhost:3000)
   - `OPENAI_API_KEY` - OpenAI API key for sentiment analysis
   - `NEXT_PUBLIC_VAPI_PUBLIC_KEY` - Vapi public key for voice journaling (client-side)
   - `VAPI_PRIVATE_KEY` - Vapi private key for server-side operations (optional)

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   ```
   http://localhost:3000
   ```

## Usage

### 1. Create an Account
- Click "Get Started" on the landing page
- Sign up with email and password

### 2. Write Your First Entry
- You'll see an AI-generated prompt on your dashboard
- Click "Start Writing" to create your first entry
- The AI will analyze your sentiment in real-time

### 3. View Your Insights
- Check your emotional trends on the dashboard
- Track your journaling streak
- Generate weekly summaries to see patterns

## Project Structure

```
journal-ai/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── entries/
│   │   └── layout.tsx
│   ├── api/                 # API routes
│   │   ├── auth/
│   │   ├── entries/
│   │   ├── prompts/
│   │   ├── summaries/
│   │   └── stats/
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # Base UI components
│   ├── dashboard/           # Dashboard components
│   └── entries/             # Entry components
├── lib/
│   ├── db.ts                # MongoDB connection
│   ├── openai.ts            # OpenAI client
│   ├── auth.ts              # NextAuth config
│   └── utils.ts             # Utilities
├── models/                  # Mongoose models
├── services/                # AI services
└── types/                   # TypeScript types
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signup` | POST | Create new user account |
| `/api/auth/[...nextauth]` | POST | Sign in/out |
| `/api/entries` | GET | Fetch user entries |
| `/api/entries` | POST | Create entry + sentiment |
| `/api/prompts` | POST | Generate AI prompt |
| `/api/summaries` | GET/POST | Summaries |
| `/api/stats` | GET | User stats + chart data |

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Features Implemented

- [x] User authentication (signup/login)
- [x] Journal entry creation
- [x] AI-powered contextual prompts
- [x] Real-time sentiment analysis
- [x] Entry history
- [x] Streak tracking
- [x] Dashboard with stats
- [x] Weekly AI summaries (API ready)

## Deployment to Vercel

1. Push to GitHub
2. Import repository to Vercel
3. Add environment variables:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (for voice journaling)
   - `VAPI_PRIVATE_KEY` (optional, for webhooks)
4. Deploy

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB URI in `.env.local`
- Check IP whitelist in MongoDB Atlas

### OpenAI API Errors
- Verify API key in `.env.local`
- Check OpenAI account credits

### Build Errors
- Delete `.next` and `node_modules`
- Run `npm install` again

## License

MIT

---
