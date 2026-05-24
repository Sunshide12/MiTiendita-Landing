import { useEffect, useRef } from 'react';

export interface CropParams {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  pixels: { x: number; y: number; width: number; height: number };
}

interface Props {
  src: string;
  cropParams: CropParams | null;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Renders an image with non-destructive crop/rotation applied via canvas.
 * Uses the exact same algorithm as getCroppedBlob (react-easy-crop convention)
 * so the canvas output matches pixel-for-pixel what the user sees in the cropper.
 *
 * If cropParams is null, falls back to a regular <img>.
 */
export default function CroppedImage({ src, cropParams, alt = '', style, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cropParams || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { rotation, pixels: pixelCrop } = cropParams;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { naturalWidth: iw, naturalHeight: ih } = img;

      // ── Step 1: draw full image rotated onto a safe-sized canvas ──────────
      const maxSize = Math.max(iw, ih);
      const safeArea = Math.ceil(2 * ((maxSize / 2) * Math.sqrt(2)));

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = safeArea;
      rotCanvas.height = safeArea;
      const rotCtx = rotCanvas.getContext('2d')!;

      rotCtx.translate(safeArea / 2, safeArea / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.translate(-safeArea / 2, -safeArea / 2);
      rotCtx.drawImage(img, safeArea / 2 - iw / 2, safeArea / 2 - ih / 2);

      // ── Step 2: extract the rotated pixel data ────────────────────────────
      const rotatedData = rotCtx.getImageData(0, 0, safeArea, safeArea);

      // ── Step 3: paint only the crop region onto the output canvas ─────────
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.putImageData(
        rotatedData,
        Math.round(0 - safeArea / 2 + iw / 2 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + ih / 2 - pixelCrop.y),
      );
    };

    img.onerror = () => {
      // On error leave canvas blank — parent can show fallback
      console.warn('[CroppedImage] Failed to load:', src);
    };

    img.src = src;
  }, [src, cropParams]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    ...style,
  };

  if (!cropParams) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={alt}
      className={className}
      style={{ ...baseStyle, objectFit: undefined }}
    />
  );
}
