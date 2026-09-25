import React, { useState, useEffect } from 'react';
import { PatchingReport, User, PhotoCondition, PhotoItem } from '../types';
import { stampWatermarkOnImage } from '../utils/photoUtils';
import {
  X,
  Camera,
  Upload,
  Layers,
  Calculator,
  AlertCircle,
  Trash2,
  Check,
  Eye,
  Info
} from 'lucide-react';

interface PatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reportData: any) => Promise<void>;
  editData: PatchingReport | null;
  currentUser: User;
  roadSuggestions: string[];
}

export const PatchingModal: React.FC<PatchingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editData,
  currentUser,
  roadSuggestions,
}) => {
  const [roadName, setRoadName] = useState('');
  const [side, setSide] = useState<'Kiri' | 'Kanan' | 'Tengah' | 'Kedua Sisi (Full)'>('Kiri');
  const [staStart, setStaStart] = useState('0+100');
  const [staEnd, setStaEnd] = useState('0+150');
  const [lengthM, setLengthM] = useState<number | string>(20);
  const [widthM, setWidthM] = useState<number | string>(2.0);
  const [thicknessCm, setThicknessCm] = useState<number | string>(4.0);
  const [damageType, setDamageType] = useState('Lubang / Pothole');
  const [notes, setNotes] = useState('');
  const [weather, setWeather] = useState<'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat'>('Cerah');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressPercent, setProgressPercent] = useState<0 | 50 | 100>(100);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto calculate volume & tonnage
  const len = Number(lengthM) || 0;
  const wid = Number(widthM) || 0;
  const thk = Number(thicknessCm) || 0;
  const calculatedVolume = parseFloat((len * wid * (thk / 100)).toFixed(3));
  const calculatedTonnage = parseFloat((calculatedVolume * 2.3).toFixed(2));

  useEffect(() => {
    if (editData) {
      setRoadName(editData.roadName);
      setSide(editData.side);
      setStaStart(editData.staStart);
      setStaEnd(editData.staEnd);
      setLengthM(editData.lengthM);
      setWidthM(editData.widthM);
      setThicknessCm(editData.thicknessCm);
      setDamageType(editData.damageType);
      setNotes(editData.notes || '');
      setWeather(editData.weather);
      setDate(editData.date);
      setProgressPercent(editData.progressPercent);
      setPhotos(editData.photos || []);
    } else {
      setRoadName(roadSuggestions[0] || 'Ruas Pantura KM 42+000 - 45+000');
      setSide('Kiri');
      setStaStart('0+100');
      setStaEnd('0+150');
      setLengthM(25);
      setWidthM(2.2);
      setThicknessCm(5);
      setDamageType('Lubang / Pothole');
      setNotes('');
      setWeather('Cerah');
      setDate(new Date().toISOString().split('T')[0]);
      setProgressPercent(100);
      setPhotos([]);
    }
    setErrorMsg('');
  }, [editData, isOpen, roadSuggestions]);

  if (!isOpen) return null;

  // Handle photo upload with auto-watermarking and strict filename generation
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, condition: PhotoCondition) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    setErrorMsg('');

    try {
      const newItems: PhotoItem[] = [];
      const currentConditionCount = photos.filter((p) => p.condition === condition).length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const orderNumber = currentConditionCount + i + 1;

        const photoItem = await stampWatermarkOnImage(file, {
          roadName: roadName || 'RuasJalan',
          staStart,
          staEnd,
          condition,
          dateStr: date,
          orderNumber,
          userName: currentUser.name,
          userRole: currentUser.role,
        });

        newItems.push(photoItem);
      }

      setPhotos((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      console.error('Error processing photos:', err);
      setErrorMsg('Gagal memproses foto. Pastikan format berkas didukung.');
    } finally {
      setIsProcessingPhoto(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadName.trim()) {
      setErrorMsg('Nama ruas jalan wajib diisi');
      return;
    }
    if (!staStart.trim() || !staEnd.trim()) {
      setErrorMsg('STA Awal dan STA Akhir wajib diisi');
      return;
    }
    if (len <= 0 || wid <= 0 || thk <= 0) {
      setErrorMsg('Panjang, lebar, dan tebal harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        roadName,
        side,
        staStart,
        staEnd,
        lengthM: len,
        widthM: wid,
        thicknessCm: thk,
        volumeM3: calculatedVolume,
        tonnageTon: calculatedTonnage,
        damageType,
        notes,
        weather,
        date,
        progressPercent,
        photos,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const photos0 = photos.filter((p) => p.condition === '0%');
  const photos50 = photos.filter((p) => p.condition === '50%');
  const photos100 = photos.filter((p) => p.condition === '100%');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e3a8a] flex items-center justify-between bg-[#0f2347] text-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              {editData ? 'Edit Laporan Harian Patching' : 'Input Laporan Harian Patching Jalan'}
            </h2>
            <p className="text-xs text-amber-200/80 font-medium">
              DPUPR Kab. Sarolangun · Formulir teknis standar Bina Marga dengan kalkulasi volume otomatis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#2563eb] text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Lokasi & Ruas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
              1. Lokasi &amp; Identitas Pekerjaan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Ruas Jalan *
                </label>
                <input
                  type="text"
                  list="road-list"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  placeholder="Contoh: Ruas Sarolangun - Pauh KM 10+000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  required
                />
                <datalist id="road-list">
                  {roadSuggestions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sisi / Jalur Pekerjaan *
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="Kiri">Kiri (Jalur Lambat/Bahu)</option>
                  <option value="Kanan">Kanan (Jalur Cepat/Median)</option>
                  <option value="Tengah">Tengah (Jalur Tengah)</option>
                  <option value="Kedua Sisi (Full)">Kedua Sisi (Full Width)</option>
                </select>
              </div>
            </div>

            {/* STA Stationing */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  STA Awal *
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-200 border border-r-0 border-slate-300 rounded-l-lg px-2 py-2 text-slate-600 font-mono text-xs font-bold">
                    STA
                  </span>
                  <input
                    type="text"
                    value={staStart}
                    onChange={(e) => setStaStart(e.target.value)}
                    placeholder="0+100"
                    className="w-full bg-slate-50 border border-slate-300 rounded-r-lg px-2.5 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  STA Akhir *
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-200 border border-r-0 border-slate-300 rounded-l-lg px-2 py-2 text-slate-600 font-mono text-xs font-bold">
                    STA
                  </span>
                  <input
                    type="text"
                    value={staEnd}
                    onChange={(e) => setStaEnd(e.target.value)}
                    placeholder="0+150"
                    className="w-full bg-slate-50 border border-slate-300 rounded-r-lg px-2.5 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Kerja *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kondisi Cuaca
                </label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="Cerah">☀️ Cerah</option>
                  <option value="Berawan">⛅ Berawan</option>
                  <option value="Hujan Ringan">🌦️ Hujan Ringan</option>
                  <option value="Hujan Lebat">🌧️ Hujan Lebat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Dimensi & Volume */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider flex items-center justify-between">
              <span>2. Dimensi Penanganan &amp; Hitung Otomatis Volume</span>
              <span className="text-slate-500 font-normal lowercase font-mono">rumus: p × l × (t/100)</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Panjang (P) [m] *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={lengthM}
                  onChange={(e) => setLengthM(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lebar (L) [m] *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tebal (T) [cm] *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={thicknessCm}
                  onChange={(e) => setThicknessCm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
            </div>

            {/* Live Calculation Display Box */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-400 text-[#0f2347]">
                  <Calculator className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#1e3a8a] font-bold">HASIL PERHITUNGAN OTOMATIS:</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black text-[#0f2347] font-mono">
                      {calculatedVolume} m³
                    </span>
                    <span className="text-xs text-slate-700">
                      ≈ <strong className="text-amber-800 font-mono font-black">{calculatedTonnage} Ton</strong> aspal hotmix
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 font-mono text-right font-medium">
                <div>Luas Permukaan: {(len * wid).toFixed(2)} m²</div>
                <div>Faktor Densitas Aspal: 2.30 Ton/m³</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kerusakan Jalan
                </label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  <option value="Lubang / Pothole">Lubang Jalan (Pothole)</option>
                  <option value="Retak Buaya / Alligator Cracking">Retak Buaya (Alligator Cracking)</option>
                  <option value="Amblas Jalur Roda / Rutting">Amblas / Alur Roda (Rutting)</option>
                  <option value="Pelepasan Butir / Ravelling">Pelepasan Butir (Ravelling)</option>
                  <option value="Bergelombang / Shoving">Bergelombang (Shoving)</option>
                  <option value="Retak Memanjang / Longitudinal">Retak Memanjang / Melintang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Persentase Progres Penanganan Saat Ini *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProgressPercent(0)}
                    className={`py-2 rounded-lg font-bold text-xs border transition ${
                      progressPercent === 0
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    0% (Galian)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressPercent(50)}
                    className={`py-2 rounded-lg font-bold text-xs border transition ${
                      progressPercent === 50
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm font-black'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    50% (Progres)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressPercent(100)}
                    className={`py-2 rounded-lg font-bold text-xs border transition ${
                      progressPercent === 100
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    100% (Selesai)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Catatan Teknis Lapangan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan suhu aspal saat hampar, jenis alat pemadat, lalu lintas, dsb."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              />
            </div>
          </div>

          {/* Section: Upload Foto Dokumentasi 0%, 50%, 100% */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
                  3. Upload Foto Dokumentasi Lapangan (0%, 50%, 100%)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dapat mengunggah lebih dari satu foto per kondisi. Penamaan file dan watermark di-generate otomatis mengikuti pola resmi: <br />
                  <code className="text-[#0f2347] font-mono text-[10px] font-bold">
                    [NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg
                  </code>
                </p>
              </div>
              {isProcessingPhoto && (
                <span className="text-xs text-amber-600 flex items-center gap-1.5 animate-pulse font-bold">
                  <Camera className="w-4 h-4 animate-spin" /> Memproses watermark foto...
                </span>
              )}
            </div>

            {/* Condition Upload Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kondisi 0% */}
              <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm" />
                    <span className="font-bold text-xs text-rose-800">Kondisi 0% (Sebelum)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{photos0.length} Foto</span>
                </div>

                <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-rose-300 bg-white hover:bg-rose-50 cursor-pointer transition text-center shadow-xs">
                  <Upload className="w-5 h-5 text-rose-500 mb-1" />
                  <span className="text-xs font-bold text-rose-800">+ Upload Foto 0%</span>
                  <span className="text-[10px] text-slate-500">Bisa pilih multiple file</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, '0%')}
                    className="hidden"
                  />
                </label>

                {/* Thumbnails 0% */}
                <div className="grid grid-cols-2 gap-2">
                  {photos0.map((p) => (
                    <div key={p.id} className="relative group rounded-md overflow-hidden border border-slate-300 bg-white shadow-xs">
                      <img src={p.url} alt={p.filename} className="w-full h-20 object-cover" />
                      <div className="p-1 text-[9px] font-mono text-slate-700 truncate bg-slate-100" title={p.filename}>
                        {p.filename}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white shadow hover:bg-rose-700 transition"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kondisi 50% */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm" />
                    <span className="font-bold text-xs text-amber-900">Kondisi 50% (Progres)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{photos50.length} Foto</span>
                </div>

                <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-amber-300 bg-white hover:bg-amber-50 cursor-pointer transition text-center shadow-xs">
                  <Upload className="w-5 h-5 text-amber-600 mb-1" />
                  <span className="text-xs font-bold text-amber-900">+ Upload Foto 50%</span>
                  <span className="text-[10px] text-slate-500">Tack coat &amp; hamparan</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, '50%')}
                    className="hidden"
                  />
                </label>

                {/* Thumbnails 50% */}
                <div className="grid grid-cols-2 gap-2">
                  {photos50.map((p) => (
                    <div key={p.id} className="relative group rounded-md overflow-hidden border border-slate-300 bg-white shadow-xs">
                      <img src={p.url} alt={p.filename} className="w-full h-20 object-cover" />
                      <div className="p-1 text-[9px] font-mono text-slate-700 truncate bg-slate-100" title={p.filename}>
                        {p.filename}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white shadow hover:bg-rose-700 transition"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kondisi 100% */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm" />
                    <span className="font-bold text-xs text-emerald-900">Kondisi 100% (Selesai)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{photos100.length} Foto</span>
                </div>

                <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-emerald-300 bg-white hover:bg-emerald-50 cursor-pointer transition text-center shadow-xs">
                  <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold text-emerald-900">+ Upload Foto 100%</span>
                  <span className="text-[10px] text-slate-500">Pemadatan final selesai</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, '100%')}
                    className="hidden"
                  />
                </label>

                {/* Thumbnails 100% */}
                <div className="grid grid-cols-2 gap-2">
                  {photos100.map((p) => (
                    <div key={p.id} className="relative group rounded-md overflow-hidden border border-slate-300 bg-white shadow-xs">
                      <img src={p.url} alt={p.filename} className="w-full h-20 object-cover" />
                      <div className="p-1 text-[9px] font-mono text-slate-700 truncate bg-slate-100" title={p.filename}>
                        {p.filename}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white shadow hover:bg-rose-700 transition"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingPhoto}
              className="px-6 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] font-black transition flex items-center gap-2 shadow-md shadow-amber-400/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : editData ? 'Simpan Perubahan Laporan' : 'Simpan & Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
