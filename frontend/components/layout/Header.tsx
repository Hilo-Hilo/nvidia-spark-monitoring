'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check auth status whenever the pathname changes (navigation happens)
    setIsAuthenticated(auth.isAuthenticated());
  }, [pathname]);

  const handleLogout = () => {
    auth.removeToken();
    setIsAuthenticated(false);
    router.push('/');
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-bold">
              System Monitor
            </Link>
            <nav className="flex space-x-4">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Dashboard
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    href="/processes"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/processes' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Processes
                  </Link>
                  <Link
                    href="/history"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/history' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    History
                  </Link>
                  <Link
                    href="/containers"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/containers' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Containers
                  </Link>
                  <Link
                    href="/services"
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/services' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Services
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

