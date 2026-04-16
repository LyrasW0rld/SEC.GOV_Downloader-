import { NextResponse } from 'next/server';
import { jobs } from '@/lib/job-store';
import { generatePdf } from '@/lib/pdf-generator';
import JSZip from 'jszip';

export async function POST(request: Request) {
  try {
    const { filings } = await request.json();

    if (!filings || !Array.isArray(filings) || filings.length === 0) {
      return NextResponse.json({ error: 'No filings provided' }, { status: 400 });
    }

    const jobId = Math.random().toString(36).substring(2, 15);
    
    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      total: filings.length,
      current: 0,
    });

    // Start processing in the background
    processJob(jobId, filings).catch(console.error);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Start download error:', error);
    return NextResponse.json({ error: 'Failed to start download' }, { status: 500 });
  }
}

async function processJob(jobId: string, filings: any[]) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  
  try {
    if (filings.length === 1) {
      // Single file, just generate PDF
      const filing = filings[0];
      job.currentFile = filing.form;
      const pdfBuffer = await generatePdf(filing.downloadUrl);
      job.current = 1;
      job.result = pdfBuffer;
    } else {
      // Multiple files, generate PDFs and zip
      const zip = new JSZip();
      
      for (let i = 0; i < filings.length; i++) {
        const filing = filings[i];
        job.currentFile = filing.form;
        
        // Add a small delay to avoid rate limiting
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
        
        const pdfBuffer = await generatePdf(filing.downloadUrl);
        const fileName = `${filing.form}_${filing.filingDate}_${filing.id}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        
        zip.file(fileName, pdfBuffer);
        job.current = i + 1;
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
      job.result = zipBuffer;
    }
    
    job.status = 'completed';
  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    job.status = 'error';
    job.error = error.message || 'Unknown error';
  }
}
