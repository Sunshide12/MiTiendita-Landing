import { useEffect, useState, useRef, useCallback } from 'react';
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
  { label: 'Analyzing images...', pct: 20 },
  { label: 'Extracting product data...', pct: 40 },
  { label: 'Generating descriptions...', pct: 60 },
  { label: 'Calculating prices...', pct: 80 },
  { label: 'Finalizing catalog...', pct: 95 },
];

const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds as a Realtime fallback

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIProcessingStatus({ storeId, storeSlug }: Props) {
  const [status, setStatus] = useState<JobStatus>('pending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(5);
  const [isRetrying, setIsRetrying] = useState(false);

  // Use a ref to track if we've already initiated redirect to avoid double-fire
  const hasRedirected = useRef(false);

  // ── Stable redirect function using ref to avoid stale closures ────────────
  const redirectToPreview = useCallback(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    console.log('[AIProcessingStatus] Redirecting to preview...');

    // Short delay to show the "Catalog ready!" UI before redirect
    setTimeout(() => {
      window.location.href = `/preview/${storeId}`;
    }, 1200);
  }, [storeId]);

  // ── Advance progress step every 3s while loading ──────────────────────────
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

  // ── POLLING + REALTIME: bulletproof status detection ──────────────────────
  // Uses both Realtime subscription AND periodic polling as fallback.
  // This eliminates the race condition where the job finishes before
  // the Realtime subscription is established.
  useEffect(() => {
    const supabase = createBrowserClient();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const handleJobStatus = (jobStatus: JobStatus, jobErrorMsg?: string | null) => {
      if (stopped) return;
      console.log('[AIProcessingStatus] Status received:', jobStatus);

      if (jobStatus === 'done') {
        setStatus('done');
        setProgress(100);
        redirectToPreview();
      } else if (jobStatus === 'error') {
        setStatus('error');
        setErrorMsg(jobErrorMsg ?? 'An unknown error occurred during processing.');
      } else if (jobStatus === 'processing') {
        setStatus('processing');
      }
    };

    // ── Poll function ────────────────────────────────────────────────────
    const pollJobStatus = async () => {
      if (stopped || hasRedirected.current) return;

      try {
        const { data } = await supabase
          .from('ai_jobs')
          .select('status, error_msg')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          handleJobStatus(data.status as JobStatus, data.error_msg);
        }
      } catch (err) {
        console.warn('[AIProcessingStatus] Poll error:', err);
      }
    };

    // ── Initial poll immediately on mount ─────────────────────────────────
    pollJobStatus();

    // ── Continuous polling as fallback ────────────────────────────────────
    pollTimer = setInterval(pollJobStatus, POLL_INTERVAL_MS);

    // ── Realtime subscription (fires faster than polling if available) ────
    const channel = supabase
      .channel(`ai_job_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'ai_jobs',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const job = payload.new as { status: JobStatus; error_msg?: string };
          console.log('[AIProcessingStatus] Realtime event:', payload.eventType, job.status);
          handleJobStatus(job.status, job.error_msg);
        }
      )
      .subscribe((s) => {
        console.log('[AIProcessingStatus] Realtime subscription:', s);
      });

    return () => {
      stopped = true;
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [storeId, storeSlug, redirectToPreview]);

  // ── Retry handler ─────────────────────────────────────────────────────────
  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMsg(null);
    setStatus('pending');
    setProgress(5);
    setStepIndex(0);
    hasRedirected.current = false;

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
    // Override message for demo
    const isDemoError = errorMsg?.includes('MISSING_API_KEY') ||
      errorMsg?.includes('401') ||
      errorMsg?.toLowerCase().includes('key') ||
      errorMsg?.includes('JSON válido');

    const displayErrorMsg = isDemoError
      ? "Esto es una prueba y actualmente no tiene la api key montada. Por favor pedir al desarrollador que te habilite para poder utilizar la IA"
      : errorMsg;

    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">Processing failed</p>
          {displayErrorMsg && (
            <p className="mt-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-left font-mono break-words">
              {displayErrorMsg}
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
