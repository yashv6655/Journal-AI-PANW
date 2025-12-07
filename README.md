# Journal AI

AI-powered journaling companion with sentiment analysis, writing prompts, and emotional trend tracking.

## Presentation Video

[Link to your 5-7 minute presentation video (YouTube/Vimeo)]

Upload your presentation video to YouTube or Vimeo and add the link above. The video should cover the problem, solution, live demo, and key learnings.

## Features

- Context-aware AI prompts based on recent entries
- Real-time sentiment analysis
- Emotional trend visualization
- Voice journaling with AI assistant
- Theme extraction and correlation insights
- Weekly summaries
- Streak tracking

## Tech Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS, Chart.js, Vapi SDK
- Backend: Next.js API Routes, Node.js
- Database: MongoDB
- Authentication: NextAuth.js
- AI: OpenAI GPT-4o-mini
- Deployment: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- OpenAI API key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with required environment variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   NEXTAUTH_SECRET=<your-nextauth-secret>
   NEXTAUTH_URL=http://localhost:3000
   OPENAI_API_KEY=<your-openai-api-key>
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=<your-vapi-public-key>
   VAPI_PRIVATE_KEY=<your-vapi-private-key>
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Project Structure

```
app/
├── (auth)/          # Authentication pages
├── (dashboard)/     # Protected dashboard routes
├── api/             # API routes
└── page.tsx         # Landing page

components/
├── ui/              # Base UI components
├── dashboard/       # Dashboard components
└── entries/         # Entry components

lib/                 # Utilities and clients
models/              # Mongoose models
services/            # AI services
types/               # TypeScript types
```

## API Routes

- `POST /api/entries` - Create entry
- `GET /api/entries` - List entries with pagination
- `GET /api/entries/[id]` - Get single entry
- `GET /api/stats` - Get statistics and chart data
- `GET /api/prompts` - Get daily prompt
- `GET /api/writing-prompts` - Generate writing prompt
- `GET /api/themes` - Get theme insights
- `GET /api/correlations` - Get correlation insights
- `POST /api/vapi/webhook` - Vapi webhook endpoint

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Lint code
```

## Deployment

1. Push code to GitHub
2. Import repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

## Troubleshooting

**MongoDB Connection Issues**
- Verify MongoDB URI in `.env.local`
- Check IP whitelist in MongoDB Atlas

**OpenAI API Errors**
- Verify API key in `.env.local`
- Check OpenAI account credits

**Build Errors**
- Delete `.next` and `node_modules`
- Run `npm install` again

## License

MIT
