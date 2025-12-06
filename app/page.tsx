import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Lock, Heart, Zap, BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(var(--color-primary))]/5 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">J</span>
              </div>
              <span className="text-2xl font-bold gradient-text">Journal AI</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-[hsl(var(--color-primary))]/10 border border-[hsl(var(--color-primary))]/20 mb-6">
                <Sparkles className="w-4 h-4 mr-2 text-[hsl(var(--color-primary))]" />
                <span className="text-sm font-semibold text-[hsl(var(--color-primary))]">
                  AI-Powered Mental Wellness
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight">
                <span className="block">Journal with</span>
                <span className="block gradient-text">purpose.</span>
                <span className="block text-2xl sm:text-3xl md:text-4xl mt-2 text-muted-foreground">
                  Understand yourself.
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
                Your AI companion turns blank pages into meaningful conversations.
                Track emotions, discover patterns, and grow through guided reflection.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto min-w-[200px] text-base h-12">
                    Start Journaling Free
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto hidden sm:block">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px] text-base h-12">
                    Sign In
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground">
                No credit card required • 100% private & secure
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Everything you need to journal better
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                AI-powered features designed to help you build a lasting journaling habit
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Sparkles,
                  title: 'AI-Powered Prompts',
                  description: 'Never stare at a blank page again. Get personalized, thoughtful questions based on your recent reflections and writing patterns.',
                  color: 'primary',
                },
                {
                  icon: TrendingUp,
                  title: 'Emotional Insights',
                  description: 'Visualize your emotional journey over time. Discover patterns, triggers, and what truly makes you feel your best.',
                  color: 'secondary',
                },
                {
                  icon: Lock,
                  title: 'Privacy First',
                  description: 'Your deepest thoughts deserve maximum security. End-to-end encryption ensures your journal stays completely private.',
                  color: 'accent',
                },
                {
                  icon: Heart,
                  title: 'Sentiment Analysis',
                  description: 'Understand your emotional state with real-time sentiment analysis that helps you recognize patterns in your thoughts.',
                  color: 'primary',
                },
                {
                  icon: Zap,
                  title: 'Weekly Summaries',
                  description: 'Get AI-generated insights about your week. Discover themes, patterns, and growth opportunities automatically.',
                  color: 'secondary',
                },
                {
                  icon: BookOpen,
                  title: 'Streak Tracking',
                  description: 'Build consistency with visual streak tracking. Celebrate your progress and maintain your journaling habit.',
                  color: 'accent',
                },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="group bg-card rounded-xl p-6 border-2 border-border card-hover"
                  >
                    <div className={`w-12 h-12 bg-[hsl(var(--color-${feature.color}))]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 text-[hsl(var(--color-${feature.color}))]`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 md:py-16 bg-gradient-to-br from-[hsl(var(--color-primary))]/5 to-[hsl(var(--color-secondary))]/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {[
                { value: '10K+', label: 'Entries Written' },
                { value: '85%', label: '7-Day Retention' },
                { value: '4.8★', label: 'User Rating' },
              ].map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="text-5xl md:text-6xl font-bold gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-base text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 gradient-primary">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Start your journaling journey today
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
              Join thousands of people using AI to build better mental health habits through journaling.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-[hsl(var(--color-primary))] hover:bg-white/90 min-w-[240px] shadow-xl text-base h-12 mb-4"
              >
                Get Started Free
              </Button>
            </Link>
            <p className="text-xs text-white/70">
              No credit card required • Start writing in 30 seconds
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 Journal AI. Your thoughts, your privacy, your growth.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
