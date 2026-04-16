export interface DownloadJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  total: number;
  current: number;
  currentFile?: string;
  result?: Buffer | Uint8Array;
  error?: string;
}

// In Next.js dev mode, route handlers might be compiled separately or hot reloaded.
// We must attach the map to globalThis to ensure it persists.
const globalStore = globalThis as any;
if (!globalStore.jobs) {
  globalStore.jobs = new Map<string, DownloadJob>();
}

export const jobs: Map<string, DownloadJob> = globalStore.jobs;
