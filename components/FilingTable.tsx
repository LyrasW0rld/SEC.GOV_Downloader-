'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { fetchFilings } from '@/lib/sec-client';
import { subMonths, isAfter, parseISO } from 'date-fns';
import JSZip from 'jszip';

interface Filing {
  id: string;
  form: string;
  filingDate: string;
  description: string;
  accessionNumber: string;
  primaryDocument: string;
  size: number;
  downloadUrl: string;
}

export default function FilingTable({ ticker, cik }: { ticker: string; cik: string }) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filterForm, setFilterForm] = useState<string>('All');
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, status: '', error: '' });
  
  useEffect(() => {
    const fetchFilingsData = async () => {
      try {
        const data = await fetchFilings(cik);
        const recentFilings = data.filings?.recent || {};
        
        if (!recentFilings.accessionNumber) {
          setFilings([]);
          setIsLoading(false);
          return;
        }

        const fourteenMonthsAgo = subMonths(new Date(), 14);
        const results: Filing[] = [];

        for (let i = 0; i < recentFilings.accessionNumber.length; i++) {
          const filingDateStr = recentFilings.filingDate[i];
          const filingDate = parseISO(filingDateStr);

          if (isAfter(filingDate, fourteenMonthsAgo)) {
            const accessionNumber = recentFilings.accessionNumber[i];
            const accessionNumberNoDashes = accessionNumber.replace(/-/g, '');
            const primaryDocument = recentFilings.primaryDocument[i];
            
            // Only include filings that have a primary document
            if (primaryDocument) {
              results.push({
                id: accessionNumber,
                form: recentFilings.form[i],
                filingDate: filingDateStr,
                description: recentFilings.primaryDocDescription[i] || recentFilings.form[i],
                accessionNumber: accessionNumber,
                primaryDocument: primaryDocument,
                size: recentFilings.size[i],
                downloadUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumberNoDashes}/${primaryDocument}`,
              });
            }
          }
        }

        setFilings(results);
      } catch (error) {
        console.error('Failed to fetch filings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilingsData();
  }, [cik]);

  const filteredFilings = filings.filter((f) => {
    if (filterForm === 'All') return true;
    if (filterForm === '10-K' && f.form === '10-K') return true;
    if (filterForm === '10-Q' && f.form === '10-Q') return true;
    if (filterForm === '8-K' && f.form === '8-K') return true;
    if (filterForm === 'DEF 14A' && f.form === 'DEF 14A') return true;
    return false;
  });

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredFilings.map(f => f.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleRowSelect = (e: React.MouseEvent, id: string) => {
    // Prevent toggling if checking the checkbox directly to avoid double toggle
    if ((e.target as HTMLElement).closest('.custom-checkbox')) return; 
    toggleSelection(id);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const startDownload = async () => {
    const selectedFilings = filings.filter(f => selectedIds.has(f.id));
    if (selectedFilings.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: selectedFilings.length, status: 'Starting...', error: '' });

    try {
      if (selectedFilings.length === 1) {
        // Single file - open SEC URL directly in new tab
        const filing = selectedFilings[0];
        window.open(filing.downloadUrl, '_blank');
        setDownloadProgress({ current: 1, total: 1, status: 'Opened filing in new tab', error: '' });
        setTimeout(() => setIsDownloading(false), 2000);
      } else {
        // Multiple files - download HTML files and create ZIP
        const zip = new JSZip();
        
        for (let i = 0; i < selectedFilings.length; i++) {
          const filing = selectedFilings[i];
          setDownloadProgress({ 
            current: i, 
            total: selectedFilings.length, 
            status: `Fetching ${filing.form}...`, 
            error: '' 
          });
          
          try {
            // Add a small delay to avoid rate limiting
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await fetch(filing.downloadUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${filing.form}`);
            
            const htmlContent = await response.text();
            const fileName = `${filing.form}_${filing.filingDate}_${filing.id}.html`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            zip.file(fileName, htmlContent);
            
            setDownloadProgress({ 
              current: i + 1, 
              total: selectedFilings.length, 
              status: `Downloaded ${filing.form}`, 
              error: '' 
            });
          } catch (error: any) {
            console.error(`Failed to download ${filing.form}:`, error);
            setDownloadProgress({ 
              current: i + 1, 
              total: selectedFilings.length, 
              status: `Error with ${filing.form}`, 
              error: error.message 
            });
          }
        }
        
        // Generate and download ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `sec_filings_${ticker}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);
        
        setDownloadProgress({ current: selectedFilings.length, total: selectedFilings.length, status: 'Download complete!', error: '' });
        setTimeout(() => setIsDownloading(false), 2000);
      }
    } catch (error: any) {
      console.error('Download failed:', error);
      setDownloadProgress({ current: 0, total: 0, status: '', error: error.message || 'Download failed' });
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  const filters = [
    { label: `All Filings (${filings.length})`, value: 'All' },
    { label: 'Annual (10-K)', value: '10-K' },
    { label: 'Quarterly (10-Q)', value: '10-Q' },
    { label: 'Current (8-K)', value: '8-K' },
    { label: 'Proxy (DEF 14A)', value: 'DEF 14A' },
  ];

  return (
    <>
      <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-[280px_1fr]">
        <aside className="border-r border-zinc-700 p-6 sm:px-[60px] sm:py-[40px] flex flex-col gap-[30px] overflow-y-auto">
          <div className="flex flex-col gap-[12px]">
            <span className="text-[11px] font-[600] uppercase text-zinc-400 tracking-widest">Document Filter</span>
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterForm(f.value)}
                className={`px-[16px] py-[8px] rounded-[4px] border text-[13px] cursor-pointer text-left transition-all duration-200 
                  ${filterForm === f.value ? 'bg-zinc-50 text-zinc-950 border-zinc-50' : 'bg-transparent text-zinc-50 border-zinc-700 hover:bg-zinc-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col gap-[12px]">
            <span className="text-[11px] font-[600] uppercase text-zinc-400 tracking-widest">Selection Mode</span>
            <button onClick={handleSelectAll} className="px-[16px] py-[8px] rounded-[4px] border border-zinc-700 text-[13px] cursor-pointer bg-transparent text-zinc-50 text-left transition-all duration-200 hover:bg-zinc-800">
              Select All
            </button>
            <button onClick={handleDeselectAll} className="px-[16px] py-[8px] rounded-[4px] border border-zinc-700 text-[13px] cursor-pointer bg-transparent text-zinc-50 text-left transition-all duration-200 hover:bg-zinc-800">
              Deselect All
            </button>
          </div>
        </aside>

        <main className="p-4 sm:px-[60px] sm:py-[40px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto pr-4">
            {filteredFilings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                <AlertCircle className="w-12 h-12 opacity-50" />
                <p className="uppercase tracking-widest text-sm font-bold">No filings found matching criteria</p>
              </div>
            ) : (
              <table className="w-full border-collapse mt-[10px]">
                <thead>
                  <tr>
                    <th className="w-[40px] text-left text-[11px] uppercase text-zinc-400 p-[12px_10px] border-b border-zinc-700 tracking-[0.05em]"></th>
                    <th className="w-[100px] text-left text-[11px] uppercase text-zinc-400 p-[12px_10px] border-b border-zinc-700 tracking-[0.05em]">Form</th>
                    <th className="w-[120px] text-left text-[11px] uppercase text-zinc-400 p-[12px_10px] border-b border-zinc-700 tracking-[0.05em]">Filed Date</th>
                    <th className="text-left text-[11px] uppercase text-zinc-400 p-[12px_10px] border-b border-zinc-700 tracking-[0.05em]">Description</th>
                    <th className="w-[80px] text-left text-[11px] uppercase text-zinc-400 p-[12px_10px] border-b border-zinc-700 tracking-[0.05em]">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFilings.map(f => {
                    const isChecked = selectedIds.has(f.id);
                    return (
                      <tr key={f.id} onClick={(e) => toggleRowSelect(e, f.id)} className="hover:bg-zinc-900/50 cursor-pointer transition-colors">
                        <td className="p-[16px_10px] border-b border-zinc-800 text-[14px] align-middle">
                          <button 
                            className={`custom-checkbox w-[18px] h-[18px] border-2 rounded-[4px] inline-flex items-center justify-center cursor-pointer transition-colors relative
                              ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-zinc-700 bg-transparent'}`}
                            onClick={() => toggleSelection(f.id)}
                            aria-label="Select filing"
                          >
                            {isChecked && <span className="text-white text-[12px] font-bold">✓</span>}
                          </button>
                        </td>
                        <td className="p-[16px_10px] border-b border-zinc-800 text-[14px] align-middle">
                          <span className="font-[700] text-blue-500 font-mono text-[15px]">{f.form}</span>
                        </td>
                        <td className="p-[16px_10px] border-b border-zinc-800 text-[14px] align-middle">
                          <span className="font-mono text-zinc-400">{f.filingDate}</span>
                        </td>
                        <td className="p-[16px_10px] border-b border-zinc-800 text-[14px] align-middle">
                          <div className="max-w-[150px] sm:max-w-[350px] whitespace-nowrap overflow-hidden text-ellipsis" title={f.description}>
                            {f.description}
                          </div>
                        </td>
                        <td className="p-[16px_10px] border-b border-zinc-800 text-[14px] align-middle text-zinc-300">
                          {formatSize(f.size)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      <footer className="h-[100px] px-6 sm:px-[60px] flex items-center justify-between border-t border-zinc-700 bg-[#0c0c0e]">
        <div className="flex-1 mr-4 sm:mr-[60px]">
          {isDownloading ? (
            <>
              <div className="flex justify-between text-[12px] mb-[8px] text-zinc-400 uppercase tracking-widest font-bold">
                <span>{downloadProgress.status}</span>
                <span>{downloadProgress.current} of {downloadProgress.total} files ({downloadProgress.total > 0 ? Math.round((downloadProgress.current/downloadProgress.total)*100) : 0}%)</span>
              </div>
              <div className="h-[4px] bg-zinc-800 rounded-[2px] overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300" 
                  style={{ width: `${downloadProgress.total > 0 ? (downloadProgress.current/downloadProgress.total)*100 : 0}%` }}
                ></div>
              </div>
              {downloadProgress.error && (
                <div className="text-[10px] text-red-500 mt-2 uppercase tracking-widest font-bold">{downloadProgress.error}</div>
              )}
            </>
          ) : (
            <div className="text-[12px] text-zinc-400 uppercase tracking-widest font-bold">
              {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected for download
            </div>
          )}
        </div>
        <button 
          onClick={startDownload}
          disabled={selectedIds.size === 0 || isDownloading}
          className="bg-blue-500 text-white border-none py-[12px] px-[16px] sm:px-[32px] sm:py-[16px] rounded-[4px] font-[700] text-[14px] uppercase cursor-pointer tracking-[0.05em] flex items-center gap-[10px] hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          )}
          <span className="hidden sm:inline">Download ZIP</span>
          <span className="sm:hidden">Download</span>
        </button>
      </footer>
    </>
  );
}
