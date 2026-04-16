import { NextResponse } from 'next/server';
import { fetchFilings } from '@/lib/sec-client';
import { subMonths, isAfter, parseISO } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get('cik');

  if (!cik) {
    return NextResponse.json({ error: 'Missing CIK' }, { status: 400 });
  }

  try {
    const data = await fetchFilings(cik);
    const recentFilings = data.filings?.recent || {};
    
    if (!recentFilings.accessionNumber) {
      return NextResponse.json([]);
    }

    const fourteenMonthsAgo = subMonths(new Date(), 14);
    const results = [];

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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Filings error:', error);
    return NextResponse.json({ error: 'Failed to fetch filings' }, { status: 500 });
  }
}
