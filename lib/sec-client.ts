export const SEC_USER_AGENT = 'SEC-Filing-App user@example.com';

export interface CompanyTicker {
  cik_str: number;
  ticker: string;
  title: string;
}

export async function fetchCompanyTickers(): Promise<Record<string, CompanyTicker>> {
  const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept-Encoding': 'gzip, deflate',
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });
  if (!res.ok) throw new Error('Failed to fetch company tickers');
  return res.json();
}

export async function fetchFilings(cik: string) {
  const paddedCik = cik.padStart(10, '0');
  const res = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept-Encoding': 'gzip, deflate',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch filings');
  return res.json();
}
