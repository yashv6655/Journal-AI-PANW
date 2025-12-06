import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userInitial = session.user.name?.[0]?.toUpperCase() || session.user.email[0].toUpperCase();
  const userName = session.user.name || session.user.email;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(var(--color-muted))]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">J</span>
                </div>
                <span className="text-xl font-bold gradient-text">
                  Journal AI
                </span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/prompts"
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Prompts
                </Link>
                <Link
                  href="/entries"
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Entries
                </Link>
                <Link
                  href="/summaries"
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Summaries
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <Link href="/entries/new" className="hidden md:block">
                <Button size="sm">
                  New Entry
                </Button>
              </Link>

              <div className="hidden md:flex items-center space-x-3">
                <div className="w-10 h-10 bg-[hsl(var(--color-primary))]/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-[hsl(var(--color-primary))]">
                    {userInitial}
                  </span>
                </div>
                <SignOutButton />
              </div>

              {/* Mobile Navigation */}
              <MobileNav userName={userName} userInitial={userInitial} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
