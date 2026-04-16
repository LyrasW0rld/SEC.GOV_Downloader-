import { NextResponse } from 'next/server';
import { jobs } from '@/lib/job-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const checkInterval = setInterval(() => {
        const job = jobs.get(jobId);
        
        if (!job) {
          sendEvent({ error: 'Job not found' });
          clearInterval(checkInterval);
          controller.close();
          return;
        }

        sendEvent({
          status: job.status,
          current: job.current,
          total: job.total,
          currentFile: job.currentFile,
          error: job.error,
        });

        if (job.status === 'completed' || job.status === 'error') {
          clearInterval(checkInterval);
          controller.close();
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(checkInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
