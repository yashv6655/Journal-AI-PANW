'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface SignOutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  fullWidth?: boolean;
}

export function SignOutButton({ 
  variant = 'ghost', 
  size = 'sm',
  className,
  fullWidth = false
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <Button 
      onClick={handleSignOut}
      variant={variant}
      size={size}
      className={fullWidth ? 'w-full' : className}
    >
      Sign Out
    </Button>
  );
}
