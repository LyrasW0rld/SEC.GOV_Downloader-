import { NextResponse } from 'next/server';
import { fetchCompanyTickers } from '@/lib/sec-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const data = await fetchCompanyTickers();
    const results = [];

    for (const key in data) {
      const company = data[key];
      const ticker = company.ticker.toLowerCase();
      const title = company.title.toLowerCase();

      if (ticker.includes(q) || title.includes(q)) {
        results.push({
          ticker: company.ticker,
          name: company.title,
          cik: company.cik_str.toString(),
        });
      }

      if (results.length >= 10) {
        break;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
