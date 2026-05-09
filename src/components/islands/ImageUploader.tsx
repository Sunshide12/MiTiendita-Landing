import React, { useState, useRef, useCallback } from 'react';
import { toast, Toaster } from 'sonner';
import { createBrowserClient } from '@/lib/supabase';
import { triggerAIProcessing } from '@/services/ai';
import { getPresignedUrls, uploadFilesToR2 } from '@/services/upload';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 6;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => ALLOWED_TYPES.includes(file.type));

    if (validFiles.length !== newFiles.length) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP).');
    }

    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Máximo ${MAX_FILES} archivos permitidos.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    toast.loading('Subiendo imágenes...', { id: 'upload-toast' });

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No hay sesión activa.');

      // 1. Get the store for the current user to get the store_id
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (storeError || !store) throw new Error('No se encontró tu tienda configurada.');

      // 2. Prepare file metadata
      const fileMetadata = files.map(f => ({
        filename: f.name,
        contentType: f.type
      }));

      // 3. Get presigned URLs
      const urls = await getPresignedUrls(store.id, fileMetadata);

      // 4. Upload to R2
      const r2Paths = await uploadFilesToR2(files, urls);

      toast.loading('¡Subida completada! Iniciando IA...', { id: 'upload-toast' });

      // 5. Trigger AI pipeline from the separated service
      await triggerAIProcessing(store.id, r2Paths);

      toast.success('Iniciando procesamiento mágico...', { id: 'upload-toast' });

      setTimeout(() => {
        window.location.href = '/processing';
      }, 500);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ocurrió un error inesperado.', { id: 'upload-toast' });
      setIsUploading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="w-full">
        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full p-10 mt-2 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ease-in-out ${isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/jpeg, image/png, image/webp"
          />
          <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
          <p className="mb-2 text-sm text-gray-700 font-medium text-center">
            <span className="font-semibold text-primary-600">Haz clic para subir</span> o arrastra y suelta
          </p>
          <p className="text-xs text-gray-500 text-center">
            JPG, PNG o WEBP (Máx. {MAX_FILES} imágenes)
          </p>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Imágenes seleccionadas ({files.length}/{MAX_FILES})</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-gray-100 rounded-md shrink-0">
                      <ImageIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          className="w-full mt-8 py-3 px-4 flex items-center justify-center gap-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Subiendo y procesando...
            </>
          ) : (
            'Subir imágenes y generar catálogo'
          )}
        </button>
      </div>
    </>
  );
}
