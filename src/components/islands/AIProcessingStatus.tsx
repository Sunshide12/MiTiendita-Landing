import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'pending' | 'processing' | 'done' | 'error';

interface Props {
  storeId: string;
  storeSlug: string;
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Analyzing images...',        pct: 20 },
  { label: 'Extracting product data...', pct: 40 },
  { label: 'Generating descriptions...', pct: 60 },
  { label: 'Calculating prices...',      pct: 80 },
  { label: 'Finalizing catalog...',      pct: 95 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIProcessingStatus({ storeId, storeSlug }: Props) {
  const [status, setStatus]         = useState<JobStatus>('pending');
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [stepIndex, setStepIndex]   = useState(0);
  const [progress, setProgress]     = useState(5);
  const [isRetrying, setIsRetrying] = useState(false);

  // ── Advance progress step every 3 s while loading ─────────────────────────
  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return;

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = Math.min(prev + 1, STEPS.length - 1);
        setProgress(STEPS[next].pct);
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`ai_job_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_jobs',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const job = payload.new as { status: JobStatus; error_msg?: string };
          console.log('[AIProcessingStatus] Realtime update:', job);
          setStatus(job.status);

          if (job.status === 'done') {
            setProgress(100);
            // Activate the store, then redirect to the path-based store page
            createBrowserClient()
              .functions.invoke('provision-subdomain', { body: { storeId } })
              .finally(() => {
                setTimeout(() => {
                  window.location.href = `/${storeSlug}`;
                }, 900);
              });
          }

          if (job.status === 'error') {
            setErrorMsg(job.error_msg ?? 'An unknown error occurred during processing.');
          }
        }
      )
      .subscribe((s) => {
        console.log('[AIProcessingStatus] Realtime subscription:', s);
      });

    return () => { supabase.removeChannel(channel); };
  }, [storeId, storeSlug]);

  // ── Retry handler ─────────────────────────────────────────────────────────
  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMsg(null);
    setStatus('pending');
    setProgress(5);
    setStepIndex(0);

    try {
      const supabase = createBrowserClient();
      const { data: products, error } = await supabase
        .from('products')
        .select('image_url')
        .eq('store_id', storeId);

      if (error || !products?.length) throw new Error('No images found to reprocess.');

      const r2PublicUrl = import.meta.env.PUBLIC_R2_PUBLIC_URL as string;
      const r2Paths = products
        .map((p) => p.image_url?.replace(`${r2PublicUrl}/`, '') ?? '')
        .filter(Boolean);

      const { error: fnError } = await supabase.functions.invoke('process-product-images', {
        body: { storeId, r2Paths },
      });
      if (fnError) throw fnError;

      console.log('[AIProcessingStatus] Retry started successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed.';
      console.error('[AIProcessingStatus] Retry error:', msg);
      setErrorMsg(msg);
      setStatus('error');
    } finally {
      setIsRetrying(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // SUCCESS state
  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {/* Full progress bar */}
        <div className="w-full max-w-sm">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full w-full transition-all duration-700" />
          </div>
        </div>
        <p className="text-lg font-semibold text-gray-800">Catalog ready!</p>
        <p className="text-sm text-gray-400">Redirecting to your store...</p>
      </div>
    );
  }

  // ERROR state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">Processing failed</p>
          {errorMsg && (
            <p className="mt-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-left font-mono break-all">
              {errorMsg}
            </p>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  // LOADING state (pending | processing)
  const currentStep = STEPS[stepIndex];

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-10 text-center">

      {/* Icon with orbit ring */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gray-800 animate-spin" />
        <Sparkles className="w-8 h-8 text-gray-700" />
      </div>

      {/* Rotating step label */}
      <div className="space-y-1">
        <p className="text-lg font-semibold text-gray-800">{currentStep.label}</p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          Our AI is analyzing each image to generate name, description, and suggested price.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-2">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gray-800 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Processing...</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Status pill */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {status === 'pending' ? 'Queued...' : 'Processing images'}
      </span>
    </div>
  );
}
