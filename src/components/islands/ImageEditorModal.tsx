import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  X, RotateCw, ZoomIn, ZoomOut, Check, Loader2,
  Pencil, Camera, Crop, ChevronRight, ArrowLeft, Tag,
  DollarSign, AlignLeft, Save,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  description: string | null;
  image_url: string;
}

interface Props {
  products: Product[];
}

type ModalMode = 'view' | 'edit';
type ImageSubview = null | 'crop' | 'replace-menu';

// ─── Canvas crop helper (uses regular canvas — cross-browser safe) ─────────────

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const maxSize = Math.max(image.naturalWidth, image.naturalHeight);
      const safeArea = Math.ceil(2 * ((maxSize / 2) * Math.sqrt(2)));

      const canvas = document.createElement('canvas');
      canvas.width = safeArea;
      canvas.height = safeArea;
      const ctx = canvas.getContext('2d')!;

      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-safeArea / 2, -safeArea / 2);
      ctx.drawImage(
        image,
        safeArea / 2 - image.naturalWidth / 2,
        safeArea / 2 - image.naturalHeight / 2
      );

      const data = ctx.getImageData(0, 0, safeArea, safeArea);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = pixelCrop.width;
      cropCanvas.height = pixelCrop.height;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.naturalWidth / 2 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.naturalHeight / 2 - pixelCrop.y)
      );

      cropCanvas.toBlob(
        (blob) => { blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')); },
        'image/jpeg', 0.92
      );
    };
    image.onerror = () => reject(new Error('Failed to load image for crop'));
    image.src = imageSrc;
  });
}

function formatPrice(price: number | null) {
  if (price == null) return null;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(price);
}

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  icon,
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const sharedClass =
    'w-full text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors resize-none';

  return (
    <div className="flex gap-2.5 items-start">
      <span className="mt-2.5 text-gray-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          {label}
        </label>
        {multiline ? (
          <textarea
            className={sharedClass}
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            className={sharedClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}

// ─── Crop sub-view ────────────────────────────────────────────────────────────

function CropView({
  imageUrl,
  onApply,
  onCancel,
}: {
  imageUrl: string;
  onApply: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels, rotation);
      const previewUrl = URL.createObjectURL(blob);
      onApply(blob, previewUrl);
    } catch (err) {
      console.error('[CropView] Crop failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Crop area */}
      <div className="relative bg-gray-950 overflow-hidden" style={{ height: 320 }}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#030712' },
            cropAreaStyle: {
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            },
          }}
        />
      </div>
      {/* Controls */}
      <div className="px-5 py-4 space-y-3 bg-white">
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full accent-gray-900 cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 font-mono w-10 text-right">{zoom.toFixed(1)}×</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> {rotation}°
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isSaving}
            className="ml-auto flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Cropping…</> : <><Crop className="w-4 h-4" /> Apply crop</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

function ProductModal({
  product: initialProduct,
  initialMode,
  onClose,
  onProductUpdate,
}: {
  product: Product;
  initialMode: ModalMode;
  onClose: () => void;
  onProductUpdate: (updated: Product) => void;
}) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [imageSubview, setImageSubview] = useState<ImageSubview>(null);
  const [visible, setVisible] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState(initialProduct.name);
  const [editBrand, setEditBrand] = useState(initialProduct.brand ?? '');
  const [editPrice, setEditPrice] = useState(
    initialProduct.price != null ? String(initialProduct.price) : ''
  );
  const [editDescription, setEditDescription] = useState(initialProduct.description ?? '');
  const [displayImageUrl, setDisplayImageUrl] = useState(initialProduct.image_url);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const parsedPrice = editPrice !== '' ? parseFloat(editPrice) : null;
      const safePrice = parsedPrice != null && !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

      const updates = {
        name: editName,
        category: editBrand || null,
        price: safePrice,
        description: editDescription || null,
        image_url: displayImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await createBrowserClient()
        .from('products')
        .update(updates)
        .eq('id', initialProduct.id);

      if (error) throw error;

      setSaveSuccess(true);
      onProductUpdate({
        ...initialProduct,
        name: editName,
        brand: editBrand || null,
        price: safePrice,
        description: editDescription || null,
        image_url: displayImageUrl,
      });

      setTimeout(() => {
        setSaveSuccess(false);
        setMode('view');
      }, 1200);
    } catch (err) {
      console.error('[ProductModal] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCropApply = async (blob: Blob, previewUrl: string) => {
    // Update display immediately with local preview
    setDisplayImageUrl(previewUrl);
    setImageSubview(null);
    // TODO: upload blob to R2 via upload-to-r2 Edge Function, then update DB
    console.log('[ProductModal] Crop applied — size:', blob.size, 'bytes. Upload to R2 pending.');
  };

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setDisplayImageUrl(localUrl);
    setImageSubview(null);
    // TODO: upload to R2 via uploadFilesToR2 then update image_url in DB
    console.log('[ProductModal] Image replaced locally. Upload to R2 pending.');
  };

  const isView = mode === 'view';
  const price = parseFloat(editPrice);
  const displayPrice = !isNaN(price) && price > 0 ? formatPrice(price) : null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="
          relative z-10 w-full sm:max-w-lg bg-white
          sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col
          max-h-[96dvh] sm:max-h-[90vh]
          transition-all duration-220 ease-out
        "
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        }}
      >
        {/* ── Crop sub-view ─────────────────────────────────────── */}
        {imageSubview === 'crop' ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
              <button onClick={() => setImageSubview(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-900">Edit image</span>
              <button onClick={handleClose} className="ml-auto p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CropView
              imageUrl={displayImageUrl}
              onApply={handleCropApply}
              onCancel={() => setImageSubview(null)}
            />
          </>
        ) : (
          <>
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {mode === 'edit' && (
                  <button onClick={() => setMode('view')} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  {isView ? 'Product' : 'Edit product'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isView && (
                  <button
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                <button onClick={handleClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div className="overflow-y-auto flex-1">
              {/* Image */}
              <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img
                  src={displayImageUrl || ''}
                  alt={editName}
                  className="w-full h-full object-cover"
                />

                {/* AI badge */}
                <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                  ✦ AI
                </span>

                {/* Image action overlay in edit mode */}
                {mode === 'edit' && (
                  <>
                    {imageSubview === 'replace-menu' ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">Image options</p>
                        <button
                          onClick={() => { setImageSubview(null); setTimeout(() => setImageSubview('crop'), 10); }}
                          className="flex items-center gap-3 w-52 px-4 py-3 bg-white rounded-xl text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors shadow-lg"
                        >
                          <Crop className="w-4 h-4 text-gray-500" />
                          <span>Edit image (crop)</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </button>
                        <button
                          onClick={() => { fileInputRef.current?.click(); setImageSubview(null); }}
                          className="flex items-center gap-3 w-52 px-4 py-3 bg-white rounded-xl text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors shadow-lg"
                        >
                          <Camera className="w-4 h-4 text-gray-500" />
                          <span>Replace image</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </button>
                        <button
                          onClick={() => setImageSubview(null)}
                          className="mt-1 text-xs text-white/60 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setImageSubview('replace-menu')}
                        className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-black/0 hover:bg-black/40 transition-all duration-200 group/imgbtn"
                        aria-label="Edit image"
                      >
                        <div className="opacity-0 group-hover/imgbtn:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Camera className="w-5 h-5 text-gray-800" />
                          </div>
                          <span className="text-xs font-semibold text-white bg-black/50 px-2.5 py-0.5 rounded-full">
                            Change image
                          </span>
                        </div>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleReplaceImage}
                    />
                  </>
                )}
              </div>

              {/* Content */}
              <div className="px-5 py-5">
                {isView ? (
                  /* ── VIEW MODE ─────────────────────────────── */
                  <div className="space-y-4">
                    {(initialProduct.brand) && (
                      <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">
                        {initialProduct.brand}
                      </p>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {initialProduct.name}
                    </h2>
                    {initialProduct.price != null ? (
                      <p className="text-2xl font-black text-gray-900">
                        {formatPrice(initialProduct.price)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Price not set</p>
                    )}
                    {initialProduct.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {initialProduct.description}
                      </p>
                    )}
                  </div>
                ) : (
                  /* ── EDIT MODE ─────────────────────────────── */
                  <div className="space-y-4">
                    <EditableField
                      icon={<Tag className="w-4 h-4" />}
                      label="Product name"
                      value={editName}
                      onChange={setEditName}
                      placeholder="Product name"
                    />
                    <EditableField
                      icon={<Tag className="w-4 h-4" />}
                      label="Brand"
                      value={editBrand}
                      onChange={setEditBrand}
                      placeholder="Brand / manufacturer"
                    />
                    <EditableField
                      icon={<DollarSign className="w-4 h-4" />}
                      label="Price (USD)"
                      value={editPrice}
                      onChange={setEditPrice}
                      type="number"
                      placeholder="0.00"
                    />
                    <EditableField
                      icon={<AlignLeft className="w-4 h-4" />}
                      label="Description"
                      value={editDescription}
                      onChange={setEditDescription}
                      multiline
                      placeholder="Short product description…"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer (edit mode only) ─────────────────────────── */}
            {mode === 'edit' && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving || saveSuccess}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-60"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : saveSuccess ? (
                    <><Check className="w-4 h-4 text-emerald-400" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save changes</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Card Portal: injects click + edit button into SSR cards ──────────────────

function CardPortal({
  product,
  onView,
  onEdit,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
}) {
  const [cardTarget, setCardTarget] = useState<Element | null>(null);
  const [slotTarget, setSlotTarget] = useState<Element | null>(null);

  useEffect(() => {
    setCardTarget(document.getElementById(`card-${product.id}`));
    setSlotTarget(document.querySelector(`[data-editor-slot="${product.id}"]`));
  }, [product.id]);

  return (
    <>
      {/* Full-card click overlay → view mode */}
      {cardTarget && createPortal(
        <button
          onClick={onView}
          className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none"
          aria-label={`Ver ${product.name}`}
          tabIndex={0}
        />,
        cardTarget
      )}

      {/* Edit button → edit mode */}
      {slotTarget && createPortal(
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="
            relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5
            text-[11px] font-medium text-gray-600
            bg-white border border-gray-200 rounded-lg shadow-sm
            hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
          "
          aria-label={`Edit ${product.name}`}
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>,
        slotTarget
      )}
    </>
  );
}

// ─── Root Island ──────────────────────────────────────────────────────────────

export default function ProductCatalogIsland({ products: initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modal, setModal] = useState<{ product: Product; mode: ModalMode } | null>(null);

  const handleProductUpdate = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <>
      {products.map((product) => (
        <CardPortal
          key={product.id}
          product={product}
          onView={() => setModal({ product, mode: 'view' })}
          onEdit={() => setModal({ product, mode: 'edit' })}
        />
      ))}

      {modal && (
        <ProductModal
          product={modal.product}
          initialMode={modal.mode}
          onClose={() => setModal(null)}
          onProductUpdate={handleProductUpdate}
        />
      )}
    </>
  );
}
