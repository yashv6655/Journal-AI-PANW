'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { Menu, X } from 'lucide-react';

interface MobileNavProps {
  userName: string;
  userInitial: string;
}

export function MobileNav({ userName, userInitial }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="md:hidden"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-64 bg-background border-l shadow-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[hsl(var(--color-primary))] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">J</span>
                </div>
                <span className="font-bold">Journal AI</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="space-y-4">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/prompts"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                Prompts
              </Link>
              <Link
                href="/prompts"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                Prompts
              </Link>
              <Link
                href="/entries"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                Entries
              </Link>
              <Link
                href="/entries/new"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                New Entry
              </Link>
              <Link
                href="/summaries"
                onClick={() => setOpen(false)}
                className="block py-2 text-foreground hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                Summaries
              </Link>
            </nav>

            <div className="mt-8 pt-8 border-t">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[hsl(var(--color-primary))]/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-[hsl(var(--color-primary))]">
                    {userInitial}
                  </span>
                </div>
                <span className="text-sm font-medium">{userName}</span>
              </div>
              <SignOutButton variant="outline" fullWidth />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
