import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Palette, Sun, Moon, Pencil, X, RotateCw, ZoomIn, ZoomOut, Loader2, RefreshCw } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { createBrowserClient } from '@/lib/supabase';
import CroppedImage from './CroppedImage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CropParams {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  pixels: { x: number; y: number; width: number; height: number };
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number | null;
  image_url: string;
  image_crop: CropParams | null;
}

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  store: StoreInfo;
  products: Product[];
  categories: string[];
}

// ─── Theme Definitions ───────────────────────────────────────────────────────

interface ModeColors {
  bg: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  headerBg: string;
  border: string;
}

interface ThemeDef {
  name: string;
  accent: string;
  accentHover: string;
  dark: ModeColors;
  light: ModeColors;
}

const THEMES: ThemeDef[] = [
  {
    name: 'Midnight Gold',
    accent: '#D4A843',
    accentHover: '#c49a38',
    dark: { bg: '#121212', cardBg: '#1e1e1e', text: '#ffffff', textSecondary: '#a1a1a1', headerBg: '#0a0a0a', border: '#2a2a2a' },
    light: { bg: '#fafaf9', cardBg: '#ffffff', text: '#1c1917', textSecondary: '#78716c', headerBg: '#ffffff', border: '#e7e5e4' },
  },
  {
    name: 'Ocean Trust',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    dark: { bg: '#0f172a', cardBg: '#1e293b', text: '#ffffff', textSecondary: '#94a3b8', headerBg: '#0b1120', border: '#334155' },
    light: { bg: '#f0f9ff', cardBg: '#ffffff', text: '#0f172a', textSecondary: '#64748b', headerBg: '#ffffff', border: '#e0f2fe' },
  },
  {
    name: 'Sunset Energy',
    accent: '#f97316',
    accentHover: '#ea580c',
    dark: { bg: '#1c1917', cardBg: '#292524', text: '#ffffff', textSecondary: '#a8a29e', headerBg: '#0c0a09', border: '#44403c' },
    light: { bg: '#fff7ed', cardBg: '#ffffff', text: '#1c1917', textSecondary: '#78716c', headerBg: '#ffffff', border: '#fed7aa' },
  },
  {
    name: 'Royal Amethyst',
    accent: '#a855f7',
    accentHover: '#9333ea',
    dark: { bg: '#18122B', cardBg: '#231c38', text: '#ffffff', textSecondary: '#a78bfa', headerBg: '#0f0a1e', border: '#3b2d5e' },
    light: { bg: '#faf5ff', cardBg: '#ffffff', text: '#18122B', textSecondary: '#7c3aed', headerBg: '#ffffff', border: '#e9d5ff' },
  },
  {
    name: 'Forest Growth',
    accent: '#22c55e',
    accentHover: '#16a34a',
    dark: { bg: '#14231a', cardBg: '#1a3024', text: '#ffffff', textSecondary: '#86efac', headerBg: '#0a1610', border: '#264d35' },
    light: { bg: '#f0fdf4', cardBg: '#ffffff', text: '#14231a', textSecondary: '#16a34a', headerBg: '#ffffff', border: '#bbf7d0' },
  },
];

// ─── Category → Image Mapping (Unsplash, free) ──────────────────────────────

const CAT_IMG: Record<string, string> = {
  moda: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  ropa: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  fashion: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
  electronica: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
  tecnologia: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
  hogar: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=400&fit=crop',
  casa: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=400&fit=crop',
  comida: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
  restaurante: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
  servicios: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
  deporte: 'https://images.unsplash.com/photo-1461896836934-bd45ba8c28c3?w=600&h=400&fit=crop',
  belleza: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop',
  salud: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop',
  juguetes: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=400&fit=crop',
  mascotas: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop',
};
const DEFAULT_CAT_IMG = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop';

function getCategoryImage(cat: string): string {
  const norm = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CAT_IMG[norm]) return CAT_IMG[norm];
  for (const [k, url] of Object.entries(CAT_IMG)) {
    if (norm.includes(k) || k.includes(norm)) return url;
  }
  return DEFAULT_CAT_IMG;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
}

/** Persist crop params (or null for reset) to Supabase */
async function saveCropToDb(productId: string, cropParams: CropParams | null): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from('products')
    .update({ image_crop: cropParams, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StorePreview({ store, products: initialProducts, categories }: Props) {
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [themeIdx, setThemeIdx] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [showModal, setShowModal] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleCropSaved = (productId: string, cropParams: CropParams | null) => {
    setProductList(prev => prev.map(p =>
      p.id === productId ? { ...p, image_crop: cropParams } : p
    ));
    setEditingProduct(null);
  };

  const theme = THEMES[themeIdx];
  const m = isDark ? theme.dark : theme.light;

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Inline keyframes (injected once) ─────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('sp-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'sp-keyframes';
    style.textContent = `
      @keyframes spFadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      @keyframes spPulse  { 0%,100% { opacity:.6 } 50% { opacity:1 } }
    `;
    document.head.appendChild(style);
  }, []);

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */

  return (
    <div style={{ backgroundColor: m.bg, color: m.text, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── Terms Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            backgroundColor: m.cardBg, borderRadius: 16, padding: 32,
            maxWidth: 500, width: '90%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            animation: 'spFadeIn .3s ease-out',
            border: `1px solid ${m.border}`,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Términos y Condiciones
            </h2>

            <div style={{
              fontSize: 13, color: m.textSecondary, lineHeight: 1.7,
              maxHeight: 280, overflowY: 'auto',
              padding: 16, borderRadius: 10,
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${m.border}`, marginBottom: 24,
            }}>
              <p style={{ marginBottom: 12 }}>Al publicar tu tienda en MiTienda, aceptas los siguientes términos:</p>
              <ol style={{ paddingLeft: 20 }}>
                {[
                  'Eres responsable de la veracidad de la información de los productos publicados.',
                  'MiTienda actúa únicamente como plataforma de publicación; las transacciones son responsabilidad del vendedor.',
                  'Las imágenes y descripciones generadas por IA son sugerencias; debes verificar su exactitud.',
                  'Te comprometes a cumplir con la legislación vigente de tu país en materia de comercio electrónico.',
                  'MiTienda se reserva el derecho de suspender tiendas que infrinjan estos términos.',
                  'Tus datos serán tratados de acuerdo con nuestra política de privacidad.',
                ].map((t, i) => <li key={i} style={{ marginBottom: 8 }}>{t}</li>)}
              </ol>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { }}
                style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  backgroundColor: theme.accent, color: '#fff',
                  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                }}
              >
                Publicar tienda
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  backgroundColor: 'transparent', color: m.textSecondary,
                  fontWeight: 600, fontSize: 14,
                  border: `1px solid ${m.border}`, cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: m.headerBg,
        borderBottom: `1px solid ${m.border}`,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{store.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme picker toggle */}
            <div ref={pickerRef} style={{ position: 'relative' }}>
              <IconButton mode={m} isDark={isDark} onClick={() => setShowPicker(!showPicker)} title="Cambiar tema">
                <Palette size={18} />
              </IconButton>

              {showPicker && (
                <div style={{
                  position: 'absolute', right: 0, top: 52,
                  backgroundColor: m.cardBg, borderRadius: 12, padding: 16,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                  border: `1px solid ${m.border}`, minWidth: 230,
                  animation: 'spFadeIn .2s ease-out',
                }}>
                  <Label text="Color" color={m.textSecondary} />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {THEMES.map((t, i) => (
                      <button key={i} onClick={() => setThemeIdx(i)} title={t.name} style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: t.accent,
                        border: themeIdx === i ? `3px solid ${m.text}` : '3px solid transparent',
                        cursor: 'pointer', transition: 'all .2s',
                        boxShadow: themeIdx === i ? `0 0 0 2px ${t.accent}` : 'none',
                      }} />
                    ))}
                  </div>

                  <Label text="Modo" color={m.textSecondary} />
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${m.border}` }}>
                    <ToggleBtn active={isDark} accent={theme.accent} secondary={m.textSecondary} onClick={() => setIsDark(true)}>
                      <Moon size={14} /> Dark
                    </ToggleBtn>
                    <ToggleBtn active={!isDark} accent={theme.accent} secondary={m.textSecondary} onClick={() => setIsDark(false)}>
                      <Sun size={14} /> Light
                    </ToggleBtn>
                  </div>
                </div>
              )}
            </div>

            {/* Cart icon (decorative) */}
            <IconButton mode={m} isDark={isDark} title="Carrito">
              <ShoppingCart size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', padding: '72px 24px 60px', textAlign: 'center', overflow: 'hidden',
        background: `linear-gradient(160deg, ${m.bg} 0%, ${theme.accent}22 50%, ${m.bg} 100%)`,
      }}>
        {/* Ghost text */}
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 110, fontWeight: 900, letterSpacing: 18,
          color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
          userSelect: 'none', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          SHOPPING
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>{store.name}</h2>
          <p style={{ fontSize: 15, color: m.textSecondary, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            Tu tienda, tu marca. Descubre nuestros productos.
          </p>
          <a href="#productos" style={{
            display: 'inline-block', padding: '12px 30px', borderRadius: 10,
            backgroundColor: theme.accent, color: '#fff', fontWeight: 600,
            fontSize: 14, textDecoration: 'none', transition: 'opacity .2s',
          }}>
            Ver productos
          </a>
        </div>

        {/* Mini gallery */}
        {productList.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 44 }}>
            {productList.slice(0, 4).map((p, i) => (
              <div key={p.id} style={{
                width: 'clamp(56px, 18vw, 110px)', aspectRatio: '110 / 74', borderRadius: 8, overflow: 'hidden',
                opacity: .75, transform: `rotate(${(i - 1.5) * 3}deg)`,
                border: `2px solid ${m.border}`,
              }}>
                {p.image_url && (
                  <CroppedImage src={p.image_url} cropParams={p.image_crop}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* Categories */}
        {categories.length > 0 && (
          <section style={{ paddingTop: 48, paddingBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Categorías</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
            }}>
              {categories.map((cat) => (
                <div key={cat} style={{
                  position: 'relative', borderRadius: 12, overflow: 'hidden',
                  aspectRatio: '16/9', cursor: 'pointer',
                }}>
                  <img src={getCategoryImage(cat)} alt={cat} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 55%)' }} />
                  <span style={{ position: 'absolute', bottom: 14, left: 16, color: '#fff', fontSize: 15, fontWeight: 600 }}>
                    {cat}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        <section id="productos" style={{ paddingTop: 32, paddingBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Productos destacados</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 20,
          }}>
            {productList.map((p) => (
              <ProductCard key={p.id} product={p}
                accent={theme.accent} accentHover={theme.accentHover}
                mode={m} isDark={isDark}
                onEditImage={() => setEditingProduct(p)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Image Editor Modal */}
      {editingProduct && (
        <ImageEditorModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleCropSaved}
        />
      )}

      {/* ─── Publish Button (sticky bottom) ──────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '12px 24px',
        backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${m.border}`,
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={() => { }}
          style={{
            padding: '12px 48px', borderRadius: 10,
            backgroundColor: theme.accent, color: '#fff',
            fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
            transition: 'opacity .2s',
            boxShadow: `0 4px 20px ${theme.accent}55`,
          }}
        >
          🚀 Publicar tienda
        </button>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        padding: '32px 24px 80px',
        textAlign: 'center', fontSize: 13,
        color: m.textSecondary,
        borderTop: `1px solid ${m.border}`,
      }}>
        © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════════ */

function IconButton({ children, mode, isDark, onClick, title }: {
  children: React.ReactNode; mode: ModeColors; isDark: boolean; onClick?: () => void; title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      border: `1px solid ${mode.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: mode.text, transition: 'background .2s',
    }}>
      {children}
    </button>
  );
}

function Label({ text, color }: { text: string; color: string }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
    }}>
      {text}
    </p>
  );
}

function ToggleBtn({ children, active, accent, secondary, onClick }: {
  children: React.ReactNode; active: boolean; accent: string; secondary: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: active ? accent : 'transparent',
      color: active ? '#fff' : secondary,
      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      transition: 'all .2s',
    }}>
      {children}
    </button>
  );
}

function ProductCard({ product, accent, accentHover, mode, isDark, onEditImage }: {
  product: Product; accent: string; accentHover: string; mode: ModeColors; isDark: boolean;
  onEditImage: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', backgroundColor: mode.cardBg, borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${mode.border}`, transition: 'all .3s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? `0 14px 34px rgba(0,0,0,${isDark ? '.4' : '.1'})` : 'none',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }}>
        {product.image_url ? (
          <CroppedImage src={product.image_url} cropParams={product.image_crop} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s', transform: hovered ? 'scale(1.05)' : 'none' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: mode.textSecondary }}>
            <ShoppingCart size={36} />
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEditImage(); }} title="Editar imagen"
          style={{
            position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}>
          <Pencil size={14} />
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{product.name}</h3>
        <p style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 14 }}>
          {product.price != null ? formatPrice(product.price)
            : <span style={{ color: mode.textSecondary, fontWeight: 400, fontSize: 13 }}>Precio por definir</span>}
        </p>
        <button style={{ width: '100%', padding: '10px 0', borderRadius: 8, backgroundColor: accent, color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = accentHover; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = accent; }}>
          Añadir al carrito
        </button>
      </div>
    </div>
  );
}

function ImageEditorModal({ product, onClose, onSaved }: {
  product: Product;
  onClose: () => void;
  onSaved: (productId: string, cropParams: CropParams | null) => void;
}) {
  const [crop, setCrop] = useState(product.image_crop?.crop ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState(product.image_crop?.zoom ?? 1);
  const [rotation, setRotation] = useState(product.image_crop?.rotation ?? 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    product.image_crop?.pixels ? (product.image_crop.pixels as unknown as Area) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const save = async (params: CropParams | null) => {
    setIsSaving(true); setError(null);
    try {
      // Include the exact pixel crop area so CroppedImage can render it correctly
      const fullParams: CropParams | null = params && croppedAreaPixels
        ? { ...params, pixels: croppedAreaPixels }
        : params;
      await saveCropToDb(product.id, fullParams);
      onSaved(product.id, fullParams);
    } catch (e: any) { setError(e.message ?? 'Error.'); setIsSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
      <div style={{ backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden', width: '90%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', animation: 'spFadeIn .3s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #333' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            Editar imagen — <span style={{ color: '#aaa', fontWeight: 400 }}>{product.name}</span>
          </span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ position: 'relative', height: 320, backgroundColor: '#000' }}>
          {product.image_url && (
            <Cropper
              image={product.image_url}
              crop={crop} zoom={zoom} rotation={rotation} aspect={1}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                cropAreaStyle: { border: '2px solid rgba(255,255,255,0.7)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' },
              }}
            />
          )}
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ZoomOut size={15} style={{ color: '#888', flexShrink: 0 }} />
            <input type="range" min={1} max={3} step={0.05} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#D4A843' }} />
            <ZoomIn size={15} style={{ color: '#888', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', width: 36, textAlign: 'right' }}>{zoom.toFixed(1)}x</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setRotation(r => (r + 90) % 360)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #444', backgroundColor: 'transparent', color: '#ccc', fontSize: 13, cursor: 'pointer' }}>
              <RotateCw size={14} /> {rotation}deg
            </button>
            <button onClick={() => save(null)} disabled={isSaving || !product.image_crop}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #444', backgroundColor: 'transparent', color: product.image_crop ? '#f87171' : '#555', fontSize: 13, cursor: product.image_crop ? 'pointer' : 'not-allowed' }}>
              <RefreshCw size={14} /> Resetear
            </button>
            <button onClick={onClose}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #444', backgroundColor: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
          <button onClick={() => save({ crop, zoom, rotation })} disabled={isSaving}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#fff', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar recorte'}
          </button>
          {error && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
