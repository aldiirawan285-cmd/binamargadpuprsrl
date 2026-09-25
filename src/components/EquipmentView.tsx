import React, { useState, useMemo } from 'react';
import { EquipmentLog, User } from '../types';
import {
  Clock,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Truck,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
  Fuel
} from 'lucide-react';
import { exportEquipmentToExcel } from '../utils/exportUtils';

interface EquipmentViewProps {
  logs: EquipmentLog[];
  rekap: any[];
  currentUser: User;
  onSaveLog: (logData: any) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  roadOptions: string[];
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  logs,
  rekap,
  currentUser,
  onSaveLog,
  onDeleteLog,
  roadOptions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('Semua');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<EquipmentLog | null>(null);

  // Form states
  const [equipmentName, setEquipmentName] = useState('Tandem Roller 8-10 Ton');
  const [equipmentType, setEquipmentType] = useState('Compactor');
  const [equipmentCode, setEquipmentCode] = useState('TR-01');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [breakMinutes, setBreakMinutes] = useState<number | string>(60);
  const [roadName, setRoadName] = useState(roadOptions[0] || 'Ruas Sarolangun - Pauh KM 10+000');
  const [locationSta, setLocationSta] = useState('STA 0+100 - 0+250');
  const [operatorName, setOperatorName] = useState('Suryanto');
  const [status, setStatus] = useState<'Beroperasi Normal' | 'Standby' | 'Perbaikan / Rusak' | 'Terkendala Cuaca'>('Beroperasi Normal');
  const [notes, setNotes] = useState('');
  const [fuelAdded, setFuelAdded] = useState<number | string>(40);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Live hours preview
  const previewHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    const net = Math.max(0, diff - Number(breakMinutes || 0));
    return parseFloat((net / 60).toFixed(2));
  }, [startTime, endTime, breakMinutes]);

  // Unique equipment names
  const equipmentOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.equipmentName));
    return ['Semua', ...Array.from(set)];
  }, [logs]);

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterEquipment !== 'Semua' && l.equipmentName !== filterEquipment) return false;
      if (filterDateStart && l.date < filterDateStart) return false;
      if (filterDateEnd && l.date > filterDateEnd) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.equipmentName.toLowerCase().includes(q) ||
          l.equipmentCode.toLowerCase().includes(q) ||
          l.operatorName.toLowerCase().includes(q) ||
          l.roadName.toLowerCase().includes(q) ||
          (l.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, filterEquipment, filterDateStart, filterDateEnd, searchQuery]);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setEquipmentName('Tandem Roller 8-10 Ton');
    setEquipmentType('Compactor');
    setEquipmentCode('TR-01');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('16:00');
    setBreakMinutes(60);
    setRoadName(roadOptions[0] || 'Ruas Sarolangun - Pauh KM 10+000');
    setLocationSta('STA 0+100 - 0+250');
    setOperatorName('Suryanto');
    setStatus('Beroperasi Normal');
    setNotes('');
    setFuelAdded(40);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EquipmentLog) => {
    setEditingLog(item);
    setEquipmentName(item.equipmentName);
    setEquipmentType(item.equipmentType);
    setEquipmentCode(item.equipmentCode);
    setDate(item.date);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setBreakMinutes(item.breakMinutes);
    setRoadName(item.roadName);
    setLocationSta(item.locationSta);
    setOperatorName(item.operatorName);
    setStatus(item.status);
    setNotes(item.notes || '');
    setFuelAdded(item.fuelAddedLiters || 0);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentName.trim() || !operatorName.trim()) {
      setFormError('Nama alat dan nama operator wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveLog({
        id: editingLog?.id,
        equipmentName,
        equipmentType,
        equipmentCode,
        date,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes || 0),
        roadName,
        locationSta,
        operatorName,
        status,
        notes,
        fuelAddedLiters: Number(fuelAdded || 0),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan log jam alat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canInput = currentUser.role === 'pelaksana' || currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Laporan Jam Kerja Alat Berat
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pencatatan waktu operasional, rekap utilisasi alat per periode, dan monitoring konsumsi BBM Bidang Bina Marga DPUPR Kab. Sarolangun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEquipmentToExcel(filtered)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            Export Excel
          </button>

          {canInput && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              + Catat Jam Alat
            </button>
          )}
        </div>
      </div>

      {/* Rekapitulasi Utilisasi per Unit Alat */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-500" />
          Rekap Utilisasi Jam Kerja per Unit Alat
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rekap.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition"
            >
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold text-[#0f2347] truncate">{item.equipmentName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1e3a8a] font-bold border border-blue-200">
                  {item.equipmentCode}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#0f2347]">
                  {item.totalJamOperasi}
                </span>
                <span className="text-xs font-bold text-slate-500">Jam Operasi</span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] flex items-center justify-between font-mono text-slate-600">
                <span>Hari Kerja: <strong className="text-[#0f2347]">{item.totalHariKerja} hr</strong></span>
                <span>BBM: <strong className="text-amber-700">{item.totalBahanBakar} L</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari alat / operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            placeholder="Tgl Mulai"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            placeholder="Tgl Akhir"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Table Equipment Logs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tgl</th>
                <th className="py-3 px-4">Nama Alat &amp; Kode</th>
                <th className="py-3 px-4">Jam Operasi (Mulai-Selesai)</th>
                <th className="py-3 px-4">Total Jam</th>
                <th className="py-3 px-4">Ruas Jalan &amp; STA</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Status &amp; BBM</th>
                {canInput && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada catatan jam kerja alat yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/60 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">{log.date}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0f2347]">{log.equipmentName}</div>
                      <div className="text-[10px] text-[#1e3a8a] font-mono font-semibold">{log.equipmentCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-700">
                      {log.startTime} - {log.endTime}
                      {log.breakMinutes > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          (Istirahat: {log.breakMinutes}m)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0f2347] whitespace-nowrap text-sm">
                      {log.totalHours} Jam
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{log.roadName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.locationSta}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {log.operatorName}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Beroperasi Normal'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.status === 'Standby'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.fuelAddedLiters ? (
                        <div className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">
                          ⛽ +{log.fuelAddedLiters} L
                        </div>
                      ) : null}
                    </td>
                    {canInput && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(log)}
                            className="p-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-[#0f2347] transition border border-slate-200"
                            title="Edit jam alat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteLog(log.id)}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition border border-slate-200"
                            title="Hapus catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Jam Alat */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#0f2347] flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {editingLog ? 'Edit Jam Kerja Alat' : 'Catat Jam Kerja Alat Berat'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Alat *
                  </label>
                  <input
                    type="text"
                    list="eq-presets"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    placeholder="Tandem Roller"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                  <datalist id="eq-presets">
                    <option value="Tandem Roller 8-10 Ton" />
                    <option value="Pneumatic Tire Roller (PTR) 10-12 Ton" />
                    <option value="Asphalt Finisher / Paver" />
                    <option value="Asphalt Cutter / Jack Hammer" />
                    <option value="Asphalt Sprayer 1000L" />
                    <option value="Dump Truck 10-12 Ton" />
                    <option value="Cold Milling Machine" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode / Plat Alat
                  </label>
                  <input
                    type="text"
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    placeholder="TR-01 / BH 8219 SZ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Istirahat (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Live total calculated preview */}
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex flex-col justify-center">
                  <div className="text-[10px] text-[#1e3a8a] uppercase font-bold">Total Jam Operasi:</div>
                  <div className="text-lg font-black text-[#0f2347] font-mono">{previewHours} Jam</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ruas Jalan Kerja
                  </label>
                  <select
                    value={roadName}
                    onChange={(e) => setRoadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    {roadOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titik Lokasi STA
                  </label>
                  <input
                    type="text"
                    value={locationSta}
                    onChange={(e) => setLocationSta(e.target.value)}
                    placeholder="STA 0+100 - 0+200"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Operator *
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Contoh: Suryanto"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kondisi / Status Alat
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="Beroperasi Normal">Beroperasi Normal</option>
                    <option value="Standby">Standby (Menunggu Material)</option>
                    <option value="Perbaikan / Rusak">Kerusakan / Breakdown</option>
                    <option value="Terkendala Cuaca">Terkendala Hujan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pengisian Solar / BBM (Liter)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fuelAdded}
                    onChange={(e) => setFuelAdded(e.target.value)}
                    placeholder="40"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Kendala
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ganti oli, filter, dsb."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Alat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
