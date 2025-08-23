'use client';

import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/new';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center justify-end">
        <nav className="flex items-center space-x-2">
          {!isHomePage && (
            <Link href="/new">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">トップに戻る</span>
                <span className="sm:hidden">トップ</span>
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
