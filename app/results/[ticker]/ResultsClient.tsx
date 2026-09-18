'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import FilingTable from '@/components/FilingTable';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResultsClient({ params }: { params: Promise<{ ticker: string }> }) {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = React.useState('');
  
  React.useEffect(() => {
    params.then(p => {
      setTicker(p.ticker.toUpperCase());
    });
  }, [params]);
  
  const cik = searchParams.get('cik');
  const name = searchParams.get('name') || ticker;

  if (!cik) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-50">
        <p className="text-red-500 mb-4 font-bold tracking-widest uppercase">Error: Missing CIK parameter.</p>
        <Link href="/" className="text-blue-500 hover:underline uppercase tracking-widest text-sm font-bold">
          Return to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      <header className="px-8 sm:px-[60px] pt-[40px] pb-[20px] flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-700 gap-8 sm:gap-0">
        <div>
          <div className="text-[12px] font-[800] uppercase tracking-[0.2em] text-blue-500 mb-2 flex items-center">
            <Link href="/" className="hover:underline flex items-center gap-2 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> EDGAR Interface / V2.4
            </Link>
          </div>
          <h1 className="text-[48px] sm:text-[84px] font-[900] leading-[0.9] tracking-[-0.05em] uppercase w-full max-w-[800px] truncate">
            {decodeURIComponent(name)}
          </h1>
        </div>
        <div className="flex gap-6 sm:gap-[40px] mb-[10px]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-400 tracking-[0.1em] mb-1">Ticker</span>
            <span className="text-[20px] sm:text-[24px] font-[800] font-mono bg-zinc-800 px-[10px] py-[2px] rounded-[2px] leading-tight flex items-center">{ticker}</span>
          </div>
          <div className="flex flex-col justify-end">
            <span className="text-[10px] uppercase text-zinc-400 tracking-[0.1em] mb-1">CIK Index</span>
            <span className="text-[16px] sm:text-[18px] font-[600]">{cik}</span>
          </div>
          <div className="flex flex-col justify-end">
            <span className="text-[10px] uppercase text-zinc-400 tracking-[0.1em] mb-1">Period</span>
            <span className="text-[16px] sm:text-[18px] font-[600]">L14 Months</span>
          </div>
        </div>
      </header>

      <FilingTable ticker={ticker} cik={cik} />
    </div>
  );
}
