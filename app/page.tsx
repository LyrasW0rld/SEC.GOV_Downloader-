import TickerSearch from '@/components/TickerSearch';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-12">
        <div className="text-center">
          <div className="text-[12px] font-[800] uppercase tracking-[0.2em] text-blue-500 mb-2">
            EDGAR Interface / V2.4
          </div>
          <h1 className="text-[64px] sm:text-[84px] font-[900] leading-[0.9] tracking-[-0.05em] uppercase">
            SEC Downloader
          </h1>
        </div>
        
        <TickerSearch />
      </div>
    </main>
  );
}
