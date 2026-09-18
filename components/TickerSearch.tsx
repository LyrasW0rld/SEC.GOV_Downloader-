'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { fetchCompanyTickers } from '@/lib/sec-client';

interface SearchResult {
  ticker: string;
  name: string;
  cik: string;
}

export default function TickerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [companyData, setCompanyData] = useState<Record<string, SearchResult> | null>(null);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load company tickers on mount
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const data = await fetchCompanyTickers();
        const searchResults: Record<string, SearchResult> = {};
        for (const key in data) {
          const company = data[key];
          searchResults[key] = {
            ticker: company.ticker,
            name: company.title,
            cik: company.cik_str.toString(),
          };
        }
        setCompanyData(searchResults);
      } catch (error) {
        console.error('Failed to load company data:', error);
      }
    };
    loadCompanyData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchCompanies = () => {
      if (!query.trim() || !companyData) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      const q = query.toLowerCase();
      const matched: SearchResult[] = [];

      for (const key in companyData) {
        const company = companyData[key];
        const ticker = company.ticker.toLowerCase();
        const name = company.name.toLowerCase();

        if (ticker.includes(q) || name.includes(q)) {
          matched.push(company);
        }

        if (matched.length >= 10) {
          break;
        }
      }

      setResults(matched);
      setIsOpen(true);
      setIsLoading(false);
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, companyData]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/results/${result.ticker}?cik=${result.cik}&name=${encodeURIComponent(result.name)}`);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-10 py-5 border border-zinc-700 rounded-none bg-zinc-950 text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg uppercase font-[500] tracking-wider transition-colors hover:border-blue-500/50"
          placeholder="SEARCH TICKER OR NAME..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-zinc-900 border border-zinc-700 overflow-hidden shadow-2xl">
          <ul className="max-h-80 overflow-auto py-1">
            {results.map((result) => (
              <li
                key={`${result.cik}-${result.ticker}`}
                className="px-5 py-4 hover:bg-zinc-800 cursor-pointer flex items-center justify-between group border-b border-zinc-800 last:border-0"
                onClick={() => handleSelect(result)}
              >
                <div className="flex flex-col">
                  <span className="font-[800] text-zinc-50 group-hover:text-blue-500 transition-colors uppercase tracking-wider text-xl">
                    {result.ticker}
                  </span>
                  <span className="text-[11px] font-[600] text-zinc-400 uppercase tracking-widest">{result.name}</span>
                </div>
                <span className="text-[12px] text-zinc-500 font-mono bg-zinc-950 px-2 py-1">CIK: {result.cik}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isOpen && query.trim() && results.length === 0 && !isLoading && (
        <div className="absolute z-10 mt-2 w-full bg-zinc-900 border border-zinc-700 p-6 text-center text-zinc-400 font-[600] uppercase tracking-widest text-sm shadow-2xl">
          NO COMPANIES FOUND MATCHING &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
