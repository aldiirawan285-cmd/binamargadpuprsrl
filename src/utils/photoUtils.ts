import { PhotoCondition, PhotoItem } from '../types';

export interface WatermarkOptions {
  roadName: string;
  staStart: string;
  staEnd: string;
  condition: PhotoCondition;
  dateStr: string;
  orderNumber: number;
  userRole?: string;
  userName?: string;
  gpsCoords?: { lat: number; lng: number } | null;
}

export function generatePhotoFilename(
  roadName: string,
  staStart: string,
  staEnd: string,
  condition: PhotoCondition,
  dateStr: string,
  index: number
): string {
  // Pattern: [NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg
  // Example: RuasA_STA0+100-0+150_100%_20260925_1.jpg
  const cleanRoad = roadName.replace(/[^a-zA-Z0-9]/g, '');
  const cleanSta = `STA${staStart}-${staEnd}`.replace(/\s+/g, '');
  const cleanDate = dateStr.replace(/-/g, '');
  return `${cleanRoad}_${cleanSta}_${condition}_${cleanDate}_${index}.jpg`;
}

/**
 * Stamp photo with official road construction watermark using HTML5 Canvas
 */
export async function stampWatermarkOnImage(
  file: File,
  options: WatermarkOptions
): Promise<PhotoItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Limit maximum dimension to 1600px for high quality yet fast uploads
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;

        // Draw original photo
        ctx.drawImage(img, 0, 0, w, h);

        // Watermark Bar at Bottom
        const barHeight = Math.max(70, Math.round(h * 0.14));
        const yStart = h - barHeight;

        // Dark gradient bar with high contrast
        const grad = ctx.createLinearGradient(0, yStart, 0, h);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, yStart, w, barHeight);

        // Accent indicator border (red for 0%, yellow for 50%, green for 100%)
        ctx.fillStyle =
          options.condition === '100%'
            ? '#10b981'
            : options.condition === '50%'
            ? '#f59e0b'
            : '#ef4444';
        ctx.fillRect(0, yStart, 8, barHeight);

        // Typography
        const fontSize1 = Math.max(14, Math.round(w * 0.022));
        const fontSize2 = Math.max(12, Math.round(w * 0.018));

        ctx.font = `bold ${fontSize1}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(
          `${options.roadName.toUpperCase()} · STA ${options.staStart} - ${options.staEnd}`,
          20,
          yStart + fontSize1 + 10
        );

        ctx.font = `bold ${fontSize2}px 'JetBrains Mono', monospace`;
        ctx.fillStyle =
          options.condition === '100%'
            ? '#34d399'
            : options.condition === '50%'
            ? '#fde047'
            : '#fca5a5';
        ctx.fillText(
          `KONDISI: ${options.condition} · TGL: ${options.dateStr} · FOTO #${options.orderNumber}`,
          20,
          yStart + fontSize1 + fontSize2 + 20
        );

        // Right side info: Coordinates or surveyor
        const rightText = options.gpsCoords
          ? `GPS: ${options.gpsCoords.lat.toFixed(5)}, ${options.gpsCoords.lng.toFixed(5)}`
          : options.userName
          ? `SURVEYOR: ${options.userName}`
          : 'DOKUMENTASI LAPANGAN BINA MARGA';

        ctx.font = `${Math.max(11, Math.round(w * 0.016))}px monospace`;
        ctx.fillStyle = '#94a3b8';
        const textWidth = ctx.measureText(rightText).width;
        ctx.fillText(rightText, w - textWidth - 20, yStart + fontSize1 + 12);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const filename = generatePhotoFilename(
          options.roadName,
          options.staStart,
          options.staEnd,
          options.condition,
          options.dateStr,
          options.orderNumber
        );

        resolve({
          id: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          condition: options.condition,
          url: dataUrl,
          filename,
          uploadedAt: new Date().toISOString(),
          uploadedBy: options.userName || 'Pelaksana',
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
