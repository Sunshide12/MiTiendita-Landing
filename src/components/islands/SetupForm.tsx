import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { createBrowserClient } from '@/lib/supabase';
import { Loader2, CheckCircle2, XCircle, Store, Tag, Globe } from 'lucide-react';

export default function SetupForm() {
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('Moda');
  const [slug, setSlug] = useState('');
  
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    setSlug(generateSlug(val));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setSlug(rawVal.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30));
  };

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus(slug.length > 0 ? 'invalid' : 'idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-slug?slug=${slug}`);
        const data = await res.json();
        
        if (res.ok && data.available) {
          setSlugStatus('available');
        } else {
          setSlugStatus('taken');
        }
      } catch (err) {
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus !== 'available') {
      toast.error('Por favor, elige un enlace válido y disponible.');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Creando tu tienda...', { id: 'setup-toast' });

    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No hay sesión activa. Por favor, inicia sesión de nuevo.');

      const { data: storeData, error: storeError } = await supabase.from('stores').insert({
        owner_id: user.id,
        name: storeName,
        slug,
        is_active: false
      }).select('id').single();

      if (storeError) throw storeError;
      if (!storeData) throw new Error('No se pudo obtener el ID de la tienda.');

      // Insert the initial category
      const { error: categoryError } = await supabase.from('categories').insert({
        store_id: storeData.id,
        name: category,
        slug: generateSlug(category),
        sort_order: 0
      });

      if (categoryError) throw categoryError;

      toast.success('¡Tienda creada con éxito!', { id: 'setup-toast' });
      
      setTimeout(() => {
        window.location.href = `/upload?storeId=${storeData.id}`;
      }, 1000);
      
    } catch (err: any) {
      toast.error(err.message || 'Hubo un error al crear la tienda.', { id: 'setup-toast' });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la tienda
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Store className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="storeName"
              type="text"
              required
              value={storeName}
              onChange={handleNameChange}
              placeholder="Ej: Zapatillas Juan"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría principal
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white appearance-none transition-colors"
            >
              <option value="Moda">Moda y Ropa</option>
              <option value="Comida">Comida y Restaurantes</option>
              <option value="Electrónica">Electrónica</option>
              <option value="Servicios">Servicios</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Tu enlace web (Subdominio)
          </label>
          <div className="flex rounded-lg shadow-sm">
            <div className="relative flex-grow focus-within:z-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="zapatillasjuan"
                className={`w-full pl-10 pr-10 py-2.5 rounded-none rounded-l-lg border focus:ring-2 focus:outline-none transition-colors ${
                  slugStatus === 'taken' || slugStatus === 'invalid'
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900'
                    : slugStatus === 'available'
                    ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {slugStatus === 'checking' && <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />}
                {slugStatus === 'available' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {slugStatus === 'taken' && <XCircle className="h-5 w-5 text-red-500" />}
              </div>
            </div>
            <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              mitienda.com/
            </span>
          </div>
          {slugStatus === 'taken' && (
            <p className="mt-1.5 text-sm text-red-600">Este nombre ya está en uso. Prueba con otro.</p>
          )}
          {slugStatus === 'invalid' && slug.length > 0 && (
            <p className="mt-1.5 text-sm text-red-600">Mínimo 3 caracteres, sin espacios ni símbolos especiales.</p>
          )}
          {slugStatus === 'available' && (
            <p className="mt-1.5 text-sm text-green-600">¡Excelente! Este enlace está disponible.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || slugStatus !== 'available'}
          className="w-full mt-8 py-2.5 px-4 flex items-center justify-center gap-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Configurando tienda...
            </>
          ) : (
            'Continuar al catálogo'
          )}
        </button>
      </form>
    </>
  );
}
