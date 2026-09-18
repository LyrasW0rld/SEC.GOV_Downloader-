import React from 'react';
import { Suspense } from 'react';
import ResultsClient from './ResultsClient';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Generate static params for export - renders all possible tickers as static pages
export async function generateStaticParams() {
  // Return a small set of common tickers for static generation
  // The page will work with any ticker at runtime via client-side rendering
  const commonTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT'];
  return commonTickers.map((ticker) => ({
    ticker: ticker.toLowerCase(),
  }));
}

export default function ResultsPage({ params }: { params: Promise<{ ticker: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-zinc-50">Loading...</div></div>}>
      <ResultsClient params={params} />
    </Suspense>
  );
}
