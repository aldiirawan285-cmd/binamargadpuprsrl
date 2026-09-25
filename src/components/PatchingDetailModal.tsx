import React, { useState } from 'react';
import { PatchingReport, User, PhotoItem } from '../types';
import {
  X,
  Printer,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  Check,
  AlertOctagon,
  FileSpreadsheet,
  FileArchive
} from 'lucide-react';
import { downloadBlob } from '../utils/exportUtils';
import JSZip from 'jszip';

interface PatchingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PatchingReport | null;
  currentUser: User;
  onReview: (decision: 'approved' | 'revision', notes: string) => Promise<void>;
  onEdit: (report: PatchingReport) => void;
}

export const PatchingDetailModal: React.FC<PatchingDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  currentUser,
  onReview,
  onEdit,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  if (!isOpen || !report) return null;

  const canPengawasReview =
    (currentUser.role === 'pengawas' || currentUser.role === 'admin') &&
    report.status !== 'Disetujui PPK';

  const canPpkApprove =
    currentUser.role === 'ppk' || currentUser.role === 'admin';

  const canEdit =
    currentUser.role === 'admin' ||
    (currentUser.role === 'pelaksana' && report.createdBy.id === currentUser.id && report.status !== 'Disetujui PPK') ||
    currentUser.role === 'pengawas';

  const handleReviewAction = async (decision: 'approved' | 'revision') => {
    if (decision === 'revision' && !reviewNotes.trim()) {
      alert('Mohon tuliskan catatan detail bagian mana yang harus diperbaiki.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await onReview(decision, reviewNotes);
      setReviewNotes('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDownloadSinglePhoto = (photo: PhotoItem) => {
    // If it's a data URL or blob URL
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = photo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadReportPhotosZip = async () => {
    if (!report || report.photos.length === 0) return;
    const zip = new JSZip();
    for (const photo of report.photos) {
      if (photo.url.startsWith('data:image')) {
        const base64Data = photo.url.split(',')[1];
        zip.file(photo.filename, base64Data, { base64: true });
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `Foto_${report.roadName.replace(/\s+/g, '_')}_STA_${report.staStart}_${report.date}.zip`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[92vh]">
        {/* Header - Dark Blue with Yellow Highlights */}
        <div className="px-6 py-4 border-b border-[#1e3a8a] flex items-center justify-between bg-[#0f2347] text-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-400 text-[#0f2347] font-black">
                STA {report.staStart} - {report.staEnd}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  report.status === 'Disetujui PPK'
                    ? 'bg-emerald-600 text-white'
                    : report.status === 'Perlu Revisi'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-400 text-[#0f2347] font-bold'
                }`}
              >
                {report.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{report.roadName}</h2>
            <div className="text-xs text-amber-200/90 font-medium">Bidang Bina Marga DPUPR Kab. Sarolangun</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg bg-[#1e3a8a] hover:bg-[#2563eb] text-white transition"
              title="Cetak Berita Acara Lapangan"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1e3a8a] hover:bg-[#2563eb] text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body - Crisp White Theme */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Technical Specs Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/60 p-4 rounded-xl border border-blue-200/80">
            <div>
              <div className="text-slate-500 text-[11px] font-semibold">SISI / JALUR</div>
              <div className="font-bold text-[#0f2347] mt-0.5 text-sm">{report.side}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px] font-semibold">DIMENSI (P × L × T)</div>
              <div className="font-mono font-bold text-[#0f2347] mt-0.5 text-sm">
                {report.lengthM}m × {report.widthM}m × {report.thicknessCm}cm
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px] font-semibold">VOLUME &amp; ESTIMASI TONASE</div>
              <div className="font-mono font-black text-amber-600 mt-0.5 text-sm">
                {report.volumeM3} m³ <span className="text-slate-600 text-xs font-bold">({report.tonnageTon} Ton)</span>
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[11px] font-semibold">TANGGAL &amp; CUACA</div>
              <div className="font-medium text-slate-800 mt-0.5 text-sm">
                {report.date} · <span className="text-[#1e3a8a] font-semibold">{report.weather}</span>
              </div>
            </div>
          </div>

          {/* Notes & Damage Type */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider">Jenis Kerusakan:</span>
              <p className="text-slate-900 font-bold mt-0.5">{report.damageType}</p>
              {report.notes && (
                <p className="text-slate-600 text-xs mt-1 italic">"{report.notes}"</p>
              )}
            </div>
            <div className="text-right text-[11px] text-slate-500 sm:border-l sm:border-slate-200 sm:pl-4">
              <div>Dicatat Oleh: <strong className="text-slate-900">{report.createdBy.name}</strong></div>
              <div>Instansi/Perusahaan: <strong className="text-slate-700">{report.createdBy.agency}</strong></div>
            </div>
          </div>

          {/* Verification Statuses (Pengawas & PPK) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pengawas Review */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verifikasi Pengawas Lapangan
                </span>
                {report.pengawasReview && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(report.pengawasReview.timestamp).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              {report.pengawasReview ? (
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{report.pengawasReview.byUserName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      report.pengawasReview.status === 'approved' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {report.pengawasReview.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 italic">
                    "{report.pengawasReview.notes || 'Sesuai spesifikasi teknis lapangan.'}"
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">Belum ada verifikasi dari pengawas.</div>
              )}
            </div>

            {/* PPK Approval */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1e3a8a] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1e3a8a]" /> Pengesahan PPK Bina Marga
                </span>
                {report.ppkApproval && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(report.ppkApproval.timestamp).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              {report.ppkApproval ? (
                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{report.ppkApproval.byUserName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      report.ppkApproval.status === 'approved' ? 'bg-[#1e3a8a] text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {report.ppkApproval.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 italic">
                    "{report.ppkApproval.notes || 'Disahkan masuk rekap opname volume.'}"
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">Menunggu persetujuan PPK.</div>
              )}
            </div>
          </div>

          {/* Photo Gallery (0%, 50%, 100%) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#0f2347] uppercase tracking-wider">
                  Foto Dokumentasi Lapangan ({report.photos.length} Berkas)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Penamaan standar: <code className="text-[#1e3a8a] font-mono bg-slate-100 px-1 rounded">[NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg</code>
                </p>
              </div>
              {report.photos.length > 0 && (
                <button
                  onClick={handleDownloadReportPhotosZip}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] font-extrabold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  Download Semua Foto (ZIP)
                </button>
              )}
            </div>

            {report.photos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Belum ada foto yang diunggah untuk laporan ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {report.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-amber-400 transition relative shadow-sm"
                  >
                    <div className="relative aspect-video bg-slate-100 cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                      <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                            photo.condition === '100%'
                              ? 'bg-emerald-600 text-white'
                              : photo.condition === '50%'
                              ? 'bg-amber-400 text-[#0f2347] font-extrabold'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          Kondisi {photo.condition}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-2 bg-slate-50 border-t border-slate-200 text-[10px]">
                      <span className="font-mono text-slate-700 truncate" title={photo.filename}>
                        {photo.filename}
                      </span>
                      <button
                        onClick={() => handleDownloadSinglePhoto(photo)}
                        className="p-1 rounded hover:bg-amber-100 text-[#1e3a8a] hover:text-[#0f2347] shrink-0"
                        title="Unduh foto"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit History / Log Perubahan Data Laporan */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold text-[#0f2347] uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-500" />
              Histori Perubahan &amp; Audit Trail Dokumen
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {report.history.map((hist, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-start gap-2">
                  <span className="text-slate-500 font-mono text-[10px] shrink-0 mt-0.5">
                    {new Date(hist.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <span className="font-bold text-[#0f2347]">{hist.userName}</span>{' '}
                    <span className="text-amber-700 font-semibold">[{hist.action}]</span>: {hist.details}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Review Form (for Pengawas or PPK) */}
          {(canPengawasReview || canPpkApprove) && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0f2347] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Panel Verifikasi &amp; Approval ({currentUser.role.toUpperCase()})
                </h4>
                <span className="text-[11px] text-slate-600 font-medium">
                  {currentUser.name} ({currentUser.agency})
                </span>
              </div>

              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Tuliskan catatan teknis pemeriksaan lapangan atau instruksi revisi..."
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction('revision')}
                  className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Minta Revisi Lapangan
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction('approved')}
                  className="px-5 py-2 rounded-lg bg-[#0f2347] hover:bg-[#1e3a8a] text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  {currentUser.role === 'ppk' ? 'Sahkan / Setujui Laporan' : 'Verifikasi Kualitas Lapangan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Dibuat: {new Date(report.createdAt).toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(report);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-bold transition shadow-xs"
              >
                Edit Data
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Big Photo Zoom Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-4xl w-full relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.filename}
                className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-white">
                <span className="font-mono">{selectedPhoto.filename}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadSinglePhoto(selectedPhoto)}
                    className="px-3 py-1 rounded bg-amber-400 text-[#0f2347] font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh
                  </button>
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
