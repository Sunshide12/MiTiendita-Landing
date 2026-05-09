import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'pending' | 'processing' | 'done' | 'error';

interface Props {
  storeId: string;
}

// ─── Rotating loading messages ────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Analizando tus productos...',
  'Generando descripciones...',
  'Calculando precios sugeridos...',
  'Identificando marcas y modelos...',
  'Puliendo los últimos detalles...',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIProcessingStatus({ storeId }: Props) {
  const [status, setStatus] = useState<JobStatus>('pending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Rotate the loading text every 2.5 seconds
  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  // Subscribe to Supabase Realtime on ai_jobs
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
          console.log('[AIProcessingStatus] Realtime update recibido:', job);
          setStatus(job.status);

          if (job.status === 'done') {
            // Small delay for user to see the success flash before redirect
            setTimeout(() => {
              window.location.href = `/preview/${storeId}`;
            }, 800);
          }

          if (job.status === 'error') {
            setErrorMsg(job.error_msg ?? 'Ocurrió un error desconocido durante el procesamiento.');
          }
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log('[AIProcessingStatus] Estado de suscripción Realtime:', subscriptionStatus);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  // Retry handler — re-invokes the Edge Function
  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMsg(null);
    setStatus('pending');

    try {
      const supabase = createBrowserClient();

      // Fetch the r2Paths from the most recent job's products for this store
      const { data: products, error } = await supabase
        .from('products')
        .select('image_url')
        .eq('store_id', storeId);

      if (error || !products?.length) {
        throw new Error('No se encontraron imágenes para reprocesar.');
      }

      const r2PublicUrl = import.meta.env.PUBLIC_R2_PUBLIC_URL as string;
      const r2Paths = products.map((p) =>
        p.image_url?.replace(`${r2PublicUrl}/`, '') ?? ''
      ).filter(Boolean);

      const { error: fnError } = await supabase.functions.invoke('process-product-images', {
        body: { storeId, r2Paths },
      });

      if (fnError) throw fnError;
      console.log('[AIProcessingStatus] Retry iniciado correctamente.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reintentar.';
      console.error('[AIProcessingStatus] Error en retry:', msg);
      setErrorMsg(msg);
      setStatus('error');
    } finally {
      setIsRetrying(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // SUCCESS — brief flash before redirect fires
  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-800">¡Catálogo generado!</p>
        <p className="text-sm text-gray-500">Redirigiendo al preview...</p>
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
          <p className="text-lg font-semibold text-gray-900">El procesamiento falló</p>
          {errorMsg && (
            <p className="mt-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-left font-mono">
              {errorMsg}
            </p>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRetrying ? 'Reintentando...' : 'Reintentar'}
        </button>
      </div>
    );
  }

  // LOADING state (pending | processing)
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-8 text-center">
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gray-900 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✦</span>
        </div>
      </div>

      {/* Rotating message */}
      <div className="h-8 overflow-hidden">
        <p
          key={messageIndex}
          className="text-base font-medium text-gray-700 animate-fade-in"
        >
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>

      <p className="text-sm text-gray-400 max-w-xs">
        Nuestra IA está analizando cada imagen para generar nombre, descripción y precio sugerido.
      </p>

      {/* Status pill */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {status === 'pending' ? 'En cola...' : 'Procesando imágenes'}
      </span>
    </div>
  );
}
