'use client';

import './globals.css';

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-base font-medium text-gray-900">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-gray-600">
            The application hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}