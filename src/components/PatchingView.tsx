import React, { useState, useMemo } from 'react';
import { PatchingReport, User } from '../types';
import {
  Hammer,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Camera
} from 'lucide-react';
import { exportPatchingToExcel, exportPatchingToCSV, downloadPhotosAsZip } from '../utils/exportUtils';

interface PatchingViewProps {
  reports: PatchingReport[];
  currentUser: User;
  onOpenReport: (report: PatchingReport) => void;
  onAddNew: () => void;
  onEdit: (report: PatchingReport) => void;
  onDelete: (report: PatchingReport) => void;
}

export const PatchingView: React.FC<PatchingViewProps> = ({
  reports,
  currentUser,
  onOpenReport,
  onAddNew,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoad, setSelectedRoad] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedDateStart, setSelectedDateStart] = useState('');
  const [selectedDateEnd, setSelectedDateEnd] = useState('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipMessage, setZipMessage] = useState('');

  // Extract unique roads
  const roadList = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(r.roadName));
    return ['Semua', ...Array.from(set)];
  }, [reports]);

  // Filtered reports
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (selectedRoad !== 'Semua' && r.roadName !== selectedRoad) return false;
      if (selectedStatus !== 'Semua' && r.status !== selectedStatus) return false;
      if (selectedDateStart && r.date < selectedDateStart) return false;
      if (selectedDateEnd && r.date > selectedDateEnd) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.roadName.toLowerCase().includes(q) ||
          r.staStart.toLowerCase().includes(q) ||
          r.staEnd.toLowerCase().includes(q) ||
          r.createdBy.name.toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reports, selectedRoad, selectedStatus, selectedDateStart, selectedDateEnd, searchQuery]);

  // Bulk ZIP Download Handler
  const handleBulkZipDownload = async () => {
    setIsZipping(true);
    setZipMessage('');
    try {
      const count = await downloadPhotosAsZip(
        filtered,
        {
          roadName: selectedRoad !== 'Semua' ? selectedRoad : undefined,
        },
        `Foto_Dokumentasi_Patching_${new Date().toISOString().split('T')[0]}.zip`
      );
      if (count === 0) {
        alert('Tidak ada foto yang cocok dengan filter yang dipilih.');
      } else {
        setZipMessage(`Berhasil mengunduh ${count} foto dalam arsip ZIP.`);
        setTimeout(() => setZipMessage(''), 4000);
      }
    } catch (err: any) {
      alert('Gagal membuat berkas ZIP: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  const canInput = currentUser.role === 'pelaksana' || currentUser.role === 'pengawas' || currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <Hammer className="w-5 h-5 text-amber-500" />
            Laporan Harian Patching Jalan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pencatatan dimensi, perhitungan volume, dokumentasi foto bertahap (0%, 50%, 100%), dan persetujuan bertingkat DPUPR Kab. Sarolangun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel */}
          <button
            onClick={() => exportPatchingToExcel(filtered)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            title="Download Rekap Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            Export Excel
          </button>

          {/* Export to CSV */}
          <button
            onClick={() => exportPatchingToCSV(filtered)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            CSV
          </button>

          {/* Bulk Photos ZIP */}
          <button
            onClick={handleBulkZipDownload}
            disabled={isZipping}
            className="px-3 py-1.5 rounded-lg bg-[#1e3a8a]/10 hover:bg-[#1e3a8a]/20 border border-[#1e3a8a] text-[#1e3a8a] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Download Foto Massal (.zip)"
          >
            <FileArchive className="w-4 h-4 text-[#1e3a8a]" />
            {isZipping ? 'Mengompres...' : 'Download Foto (ZIP)'}
          </button>

          {/* Input New Report */}
          {canInput ? (
            <button
              onClick={onAddNew}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              + Input Laporan
            </button>
          ) : (
            <div className="text-[11px] text-[#1e3a8a] bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 font-semibold">
              Role PPK: Hak Akses Verifikasi &amp; Download Rekap
            </div>
          )}
        </div>
      </div>

      {zipMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{zipMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari STA / pelaksana..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Road Filter */}
        <div>
          <select
            value={selectedRoad}
            onChange={(e) => setSelectedRoad(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {roadList.map((r) => (
              <option key={r} value={r}>
                Ruas: {r}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="Semua">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Menunggu Verifikasi Pengawas">Menunggu Pengawas</option>
            <option value="Diverifikasi Pengawas">Diverifikasi Pengawas</option>
            <option value="Disetujui PPK">Disetujui PPK</option>
            <option value="Perlu Revisi">Perlu Revisi</option>
          </select>
        </div>

        {/* Date Start */}
        <div>
          <input
            type="date"
            value={selectedDateStart}
            onChange={(e) => setSelectedDateStart(e.target.value)}
            placeholder="Tgl Mulai"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Date End */}
        <div>
          <input
            type="date"
            value={selectedDateEnd}
            onChange={(e) => setSelectedDateEnd(e.target.value)}
            placeholder="Tgl Akhir"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tgl</th>
                <th className="py-3 px-4">Ruas Jalan &amp; Sisi</th>
                <th className="py-3 px-4">Station (STA)</th>
                <th className="py-3 px-4">Dimensi (P×L×T)</th>
                <th className="py-3 px-4">Volume &amp; Tonase</th>
                <th className="py-3 px-4">Foto (0-50-100)</th>
                <th className="py-3 px-4">Status &amp; Approval</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada laporan pekerjaan yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => {
                  const photos0 = report.photos.filter((p) => p.condition === '0%').length;
                  const photos50 = report.photos.filter((p) => p.condition === '50%').length;
                  const photos100 = report.photos.filter((p) => p.condition === '100%').length;

                  const canModify =
                    currentUser.role === 'admin' ||
                    (currentUser.role === 'pelaksana' && report.createdBy.id === currentUser.id && report.status !== 'Disetujui PPK') ||
                    currentUser.role === 'pengawas';

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-blue-50/60 transition group cursor-pointer"
                      onClick={() => onOpenReport(report)}
                    >
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-600 font-medium">
                        {report.date}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0f2347]">{report.roadName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Sisi: {report.side}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          STA {report.staStart} - {report.staEnd}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                        {report.lengthM}m × {report.widthM}m × {report.thicknessCm}cm
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#0f2347]">{report.volumeM3} m³</div>
                        <div className="text-[10px] text-slate-500 font-mono font-medium">{report.tonnageTon} Ton</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              photos0 > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'text-slate-300'
                            }`}
                          >
                            0%: {photos0}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              photos50 > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-300'
                            }`}
                          >
                            50%: {photos50}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              photos100 > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'text-slate-300'
                            }`}
                          >
                            100%: {photos100}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            report.status === 'Disetujui PPK'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : report.status === 'Diverifikasi Pengawas'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : report.status === 'Perlu Revisi'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {report.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Oleh: {report.createdBy.name.split(' ')[0]}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenReport(report)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#0f2347] hover:text-white text-slate-700 transition shadow-xs"
                            title="Lihat Detail & Foto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canModify && (
                            <button
                              onClick={() => onEdit(report)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-400 text-amber-800 hover:text-slate-950 border border-amber-200 transition shadow-xs"
                              title="Edit Laporan"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(currentUser.role === 'admin' ||
                            (currentUser.role === 'pelaksana' && report.createdBy.id === currentUser.id && report.status === 'Draft')) && (
                            <button
                              onClick={() => onDelete(report)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 transition shadow-xs"
                              title="Hapus Laporan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
