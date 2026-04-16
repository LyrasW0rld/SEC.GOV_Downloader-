import { NextResponse } from 'next/server';
import { jobs } from '@/lib/job-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status !== 'completed' || !job.result) {
    return NextResponse.json({ error: 'Job not completed' }, { status: 400 });
  }

  const isZip = job.total > 1;
  const contentType = isZip ? 'application/zip' : 'application/pdf';
  const filename = isZip ? `sec_filings_${jobId}.zip` : `sec_filing_${jobId}.pdf`;

  const response = new NextResponse(job.result as unknown as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

  // Clean up job after downloading
  // jobs.delete(jobId); // Optional: keep it for a while or delete immediately

  return response;
}
