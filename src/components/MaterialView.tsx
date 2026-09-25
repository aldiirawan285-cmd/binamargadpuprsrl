import React, { useState, useMemo } from 'react';
import { MaterialTransaction, MaterialStockSummary, User } from '../types';
import {
  Package,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Trash2,
  Edit2,
  X,
  Camera,
  Check,
  AlertCircle
} from 'lucide-react';
import { exportMaterialToExcel } from '../utils/exportUtils';

interface MaterialViewProps {
  materials: MaterialTransaction[];
  stockSummaries: MaterialStockSummary[];
  currentUser: User;
  onSaveTransaction: (txData: any) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  roadOptions: string[];
}

export const MaterialView: React.FC<MaterialViewProps> = ({
  materials,
  stockSummaries,
  currentUser,
  onSaveTransaction,
  onDeleteTransaction,
  roadOptions,
}) => {
  const [filterMaterial, setFilterMaterial] = useState('Semua');
  const [filterType, setFilterType] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialTransaction | null>(null);

  // Form states
  const [materialName, setMaterialName] = useState('Aspal AC-WC Hotmix');
  const [txType, setTxType] = useState<'masuk' | 'keluar' | 'pakai'>('masuk');
  const [amount, setAmount] = useState<number | string>(15.0);
  const [unit, setUnit] = useState<'Ton' | 'm³' | 'Drum' | 'Zak' | 'Liter' | 'Kg'>('Ton');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceOrDest, setSourceOrDest] = useState('');
  const [selectedRoad, setSelectedRoad] = useState(roadOptions[0] || '');
  const [staLocation, setStaLocation] = useState('0+100 - 0+150');
  const [waybill, setWaybill] = useState('');
  const [notes, setNotes] = useState('');
  const [proofPhotoData, setProofPhotoData] = useState<string | undefined>(undefined);
  const [proofPhotoName, setProofPhotoName] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Unique material names for dropdown
  const materialList = useMemo(() => {
    const set = new Set<string>();
    stockSummaries.forEach((s) => set.add(s.materialName));
    materials.forEach((m) => set.add(m.materialName));
    return ['Semua', ...Array.from(set)];
  }, [stockSummaries, materials]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (filterMaterial !== 'Semua' && m.materialName !== filterMaterial) return false;
      if (filterType !== 'Semua' && m.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          m.materialName.toLowerCase().includes(q) ||
          m.sourceOrDestination.toLowerCase().includes(q) ||
          (m.waybillNumber || '').toLowerCase().includes(q) ||
          (m.notes || '').toLowerCase().includes(q) ||
          (m.roadName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [materials, filterMaterial, filterType, searchQuery]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setMaterialName('Aspal AC-WC Hotmix');
    setTxType('masuk');
    setAmount(15.0);
    setUnit('Ton');
    setDate(new Date().toISOString().split('T')[0]);
    setSourceOrDest('AMP PT Adhi Mitra Persada');
    setSelectedRoad(roadOptions[0] || '');
    setStaLocation('0+100 - 0+150');
    setWaybill('');
    setNotes('');
    setProofPhotoData(undefined);
    setProofPhotoName(undefined);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: MaterialTransaction) => {
    setEditingItem(tx);
    setMaterialName(tx.materialName);
    setTxType(tx.type);
    setAmount(tx.amount);
    setUnit(tx.unit);
    setDate(tx.date);
    setSourceOrDest(tx.sourceOrDestination);
    setSelectedRoad(tx.roadName || roadOptions[0] || '');
    setStaLocation(tx.staLocation || '');
    setWaybill(tx.waybillNumber || '');
    setNotes(tx.notes || '');
    setProofPhotoData(tx.proofPhotoData);
    setProofPhotoName(tx.proofPhotoName);
    setFormError('');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProofPhotoData(event.target?.result as string);
      setProofPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setFormError('Nama material wajib diisi');
      return;
    }
    if (Number(amount) <= 0) {
      setFormError('Jumlah material harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTransaction({
        id: editingItem?.id,
        materialName,
        date,
        type: txType,
        amount: Number(amount),
        unit,
        sourceOrDestination: sourceOrDest,
        roadName: txType === 'pakai' ? selectedRoad : undefined,
        staLocation: txType === 'pakai' ? staLocation : undefined,
        waybillNumber: waybill,
        notes,
        proofPhotoName,
        proofPhotoData,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi material');
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
            <Package className="w-5 h-5 text-amber-500" />
            Laporan &amp; Kontrol Material Jalan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pencatatan material masuk, keluar, dan pemakaian lapangan dengan buku saldo stok otomatis Bidang Bina Marga DPUPR Kab. Sarolangun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportMaterialToExcel(filtered)}
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
              + Transaksi Material
            </button>
          )}
        </div>
      </div>

      {/* Real-time Material Stock Ledger Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-500" />
          Buku Saldo Material Berjalan (Stok Lapangan Terkini)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stockSummaries.map((stock, i) => {
            const isLow = stock.currentStock <= 5;
            return (
              <div
                key={i}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold text-[#0f2347] truncate">{stock.materialName}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      isLow ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isLow ? 'Stok Kritis' : 'Normal'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black font-mono ${
                      isLow ? 'text-rose-600' : 'text-[#0f2347]'
                    }`}
                  >
                    {stock.currentStock}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{stock.unit}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] grid grid-cols-3 gap-1 font-mono">
                  <div className="text-slate-500">
                    <span className="text-emerald-700 font-bold block">+Masuk</span>
                    {stock.totalMasuk}
                  </div>
                  <div className="text-slate-500">
                    <span className="text-[#1e3a8a] font-bold block">-Pakai</span>
                    {stock.totalPakai}
                  </div>
                  <div className="text-slate-500">
                    <span className="text-rose-700 font-bold block">-Keluar</span>
                    {stock.totalKeluar}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari sumber / nota / keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <select
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            {materialList.map((m) => (
              <option key={m} value={m}>
                Material: {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="Semua">Semua Transaksi</option>
            <option value="masuk">Masuk (+)</option>
            <option value="pakai">Pakai di Lapangan (-)</option>
            <option value="keluar">Keluar / Retur (-)</option>
          </select>
        </div>
      </div>

      {/* Table Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tgl</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Tipe Transaksi</th>
                <th className="py-3 px-4">Jumlah</th>
                <th className="py-3 px-4">Sumber / Tujuan &amp; Lokasi STA</th>
                <th className="py-3 px-4">No. Surat Jalan / Nota</th>
                <th className="py-3 px-4">Bukti / Foto</th>
                {canInput && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada riwayat transaksi material yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blue-50/60 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#0f2347]">{tx.materialName}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.type === 'masuk' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ArrowDownLeft className="w-3 h-3" /> MASUK
                        </span>
                      )}
                      {tx.type === 'pakai' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-[#1e3a8a] border border-blue-300">
                          <TrendingDown className="w-3 h-3" /> PAKAI LAPANGAN
                        </span>
                      )}
                      {tx.type === 'keluar' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <ArrowUpRight className="w-3 h-3" /> RETUR / KELUAR
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0f2347] whitespace-nowrap text-sm">
                      {tx.amount} {tx.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{tx.sourceOrDestination}</div>
                      {tx.roadName && (
                        <div className="text-[10px] text-amber-700 font-mono font-semibold">
                          {tx.roadName} {tx.staLocation ? `(${tx.staLocation})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {tx.waybillNumber || '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.proofPhotoName ? (
                        <span className="text-[10px] text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                          📷 {tx.proofPhotoName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    {canInput && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-[#0f2347] transition border border-slate-200"
                            title="Edit transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition border border-slate-200"
                            title="Hapus transaksi"
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

      {/* Modal Add / Edit Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#0f2347] flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                {editingItem ? 'Edit Transaksi Material' : 'Catat Transaksi Material'}
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
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Transaksi *
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="masuk">Masuk (+ Stok)</option>
                    <option value="pakai">Pakai di Lapangan (- Stok)</option>
                    <option value="keluar">Keluar / Retur (- Stok)</option>
                  </select>
                </div>

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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Material *
                </label>
                <input
                  type="text"
                  list="mat-presets"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="Contoh: Aspal AC-WC Hotmix"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  required
                />
                <datalist id="mat-presets">
                  <option value="Aspal AC-WC Hotmix" />
                  <option value="Aspal AC-BC Hotmix" />
                  <option value="Tack Coat (Aspal Emulsi)" />
                  <option value="Prime Coat" />
                  <option value="Agregat Kelas A" />
                  <option value="Agregat Kelas B" />
                  <option value="Pasir Pasang" />
                  <option value="Semen PC 50kg" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Volume / Ton *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="Ton">Ton</option>
                    <option value="m³">m³</option>
                    <option value="Drum">Drum</option>
                    <option value="Zak">Zak</option>
                    <option value="Liter">Liter</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sumber / Supplier / Titik Tujuan
                </label>
                <input
                  type="text"
                  value={sourceOrDest}
                  onChange={(e) => setSourceOrDest(e.target.value)}
                  placeholder="Contoh: AMP PT Adhi Mitra Persada / Gudang"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {txType === 'pakai' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ruas Jalan Terkait
                    </label>
                    <select
                      value={selectedRoad}
                      onChange={(e) => setSelectedRoad(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium"
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
                      Titik STA
                    </label>
                    <input
                      type="text"
                      value={staLocation}
                      onChange={(e) => setStaLocation(e.target.value)}
                      placeholder="Contoh: STA 0+100"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Surat Jalan / Tiket
                  </label>
                  <input
                    type="text"
                    value={waybill}
                    onChange={(e) => setWaybill(e.target.value)}
                    placeholder="Contoh: SJ-AMP-8821"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Foto Bukti / Nota Timbang
                  </label>
                  <label className="flex items-center justify-center p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs text-slate-700">
                    <Camera className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    <span>{proofPhotoName ? 'Ganti Foto' : 'Unggah Foto'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {proofPhotoName && (
                    <div className="text-[10px] text-[#1e3a8a] font-medium mt-1 truncate">{proofPhotoName}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan suhu tiba, nomor batch pabrik, dsb."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-400"
                />
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
