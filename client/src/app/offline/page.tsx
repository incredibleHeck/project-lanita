"use client";

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.href = '/';
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto h-24 w-24 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
            <WifiOff className="h-12 w-12 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
          <p className="text-muted-foreground">
            This page isn&apos;t available offline. Please check your internet connection and try again.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </Button>
          
          <Link href="/" className="block">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="mr-2 h-5 w-5" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Tip:</strong> Some features work offline:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Mark attendance (syncs when online)</li>
            <li>• View cached student lists</li>
            <li>• Access recently viewed pages</li>
          </ul>
        </div>

        {isOnline && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">
              You&apos;re back online! Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
