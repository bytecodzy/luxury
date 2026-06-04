'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  const isDataError = error.message?.includes('undefined') ||
    error.message?.includes('null') ||
    error.message?.includes('length') ||
    error.message?.includes('map is not a function');

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 p-8 text-center">
          <div className="mb-6 rounded-full bg-amber-900/20 p-6">
            <svg className="h-12 w-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-amber-100">Something went wrong!</h2>
          <p className="mb-2 max-w-md text-sm text-amber-200/60">
            {isDataError
              ? 'We encountered a data loading issue. This is usually temporary — please try again.'
              : error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="mb-6 text-xs text-amber-200/30">Error ID: {error.digest}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-md bg-amber-600 px-6 py-2.5 text-sm font-medium text-stone-950 hover:bg-amber-500 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="rounded-md border border-amber-900/30 px-6 py-2.5 text-sm font-medium text-amber-200/70 hover:border-amber-600/40 hover:text-amber-400 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
