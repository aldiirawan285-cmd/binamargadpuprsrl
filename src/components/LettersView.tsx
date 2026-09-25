import React, { useState, useMemo } from 'react';
import { LetterItem, User } from '../types';
import {
  Mail,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Trash2,
  Edit2,
  X,
  Check,
  Paperclip,
  Eye,
  Archive
} from 'lucide-react';
import { exportLettersToExcel, downloadBlob } from '../utils/exportUtils';

interface LettersViewProps {
  letters: LetterItem[];
  currentUser: User;
  onSaveLetter: (letterData: any) => Promise<void>;
  onDeleteLetter: (id: string) => Promise<void>;
}

export const LettersView: React.FC<LettersViewProps> = ({
  letters,
  currentUser,
  onSaveLetter,
  onDeleteLetter,
}) => {
  const [filterType, setFilterType] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LetterItem | null>(null);

  // Form states
  const [letterNumber, setLetterNumber] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedOrSentDate, setReceivedOrSentDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'masuk' | 'keluar'>('masuk');
  const [subject, setSubject] = useState('');
  const [originOrDestination, setOriginOrDestination] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [attachmentData, setAttachmentData] = useState<string | undefined>(undefined);
  const [attachmentType, setAttachmentType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'proses' | 'selesai' | 'diarsipkan'>('proses');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return letters.filter((l) => {
      if (filterType !== 'semua' && l.type !== filterType) return false;
      if (filterStatus !== 'semua' && l.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.letterNumber.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          l.originOrDestination.toLowerCase().includes(q) ||
          (l.dispositionNotes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [letters, filterType, filterStatus, searchQuery]);

  const handleOpenAdd = () => {
    setEditingLetter(null);
    setLetterNumber('');
    setLetterDate(new Date().toISOString().split('T')[0]);
    setReceivedOrSentDate(new Date().toISOString().split('T')[0]);
    setType('masuk');
    setSubject('');
    setOriginOrDestination('');
    setAttachmentName(undefined);
    setAttachmentData(undefined);
    setAttachmentType(undefined);
    setStatus('proses');
    setDispositionNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LetterItem) => {
    setEditingLetter(item);
    setLetterNumber(item.letterNumber);
    setLetterDate(item.letterDate);
    setReceivedOrSentDate(item.receivedOrSentDate);
    setType(item.type);
    setSubject(item.subject);
    setOriginOrDestination(item.originOrDestination);
    setAttachmentName(item.attachmentName);
    setAttachmentData(item.attachmentData);
    setAttachmentType(item.attachmentType);
    setStatus(item.status);
    setDispositionNotes(item.dispositionNotes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentData(event.target?.result as string);
      setAttachmentName(file.name);
      setAttachmentType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterNumber.trim() || !subject.trim() || !originOrDestination.trim()) {
      setFormError('Nomor surat, perihal, dan asal/tujuan surat wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveLetter({
        id: editingLetter?.id,
        letterNumber,
        letterDate,
        receivedOrSentDate,
        type,
        subject,
        originOrDestination,
        attachmentName,
        attachmentData,
        attachmentType,
        status,
        dispositionNotes,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan surat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Agenda Surat Masuk &amp; Surat Keluar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pengarsipan persuratan dinas, permohonan pengujian lab, instruksi lapangan, dan disposisi tindak lanjut Bidang Bina Marga DPUPR Kab. Sarolangun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportLettersToExcel(filtered)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            Export Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            + Catat Surat Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor / perihal / instansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="semua">Semua Jenis (Masuk &amp; Keluar)</option>
            <option value="masuk">Hanya Surat Masuk</option>
            <option value="keluar">Hanya Surat Keluar</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="semua">Semua Status</option>
            <option value="proses">Dalam Proses</option>
            <option value="selesai">Selesai Ditindaklanjuti</option>
            <option value="diarsipkan">Diarsipkan</option>
          </select>
        </div>
      </div>

      {/* Table of Letters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Nomor Surat</th>
                <th className="py-3 px-4">Tgl Surat &amp; Terima</th>
                <th className="py-3 px-4">Perihal</th>
                <th className="py-3 px-4">Asal / Tujuan Surat</th>
                <th className="py-3 px-4">Lampiran</th>
                <th className="py-3 px-4">Status &amp; Disposisi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada agenda surat yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((letter) => (
                  <tr key={letter.id} className="hover:bg-blue-50/60 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {letter.type === 'masuk' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1e3a8a] border border-blue-300">
                          <ArrowDownLeft className="w-3 h-3" /> SURAT MASUK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ArrowUpRight className="w-3 h-3" /> SURAT KELUAR
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0f2347] whitespace-nowrap">
                      {letter.letterNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div>Tgl: {letter.letterDate}</div>
                      <div className="text-[10px] text-slate-500">Kirim/Trima: {letter.receivedOrSentDate}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-2">{letter.subject}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{letter.originOrDestination}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {letter.attachmentName ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[120px] truncate">{letter.attachmentName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          letter.status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : letter.status === 'diarsipkan'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {letter.status}
                      </span>
                      {letter.dispositionNotes && (
                        <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-1 italic max-w-[180px]">
                          "{letter.dispositionNotes}"
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(letter)}
                          className="p-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-[#0f2347] transition border border-slate-200"
                          title="Edit surat"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteLetter(letter.id)}
                          className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition border border-slate-200"
                          title="Hapus surat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Surat */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#0f2347] flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-500" />
                {editingLetter ? 'Edit Agenda Surat' : 'Catat Surat Masuk / Keluar'}
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
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Surat *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="masuk">Surat Masuk (Diterima)</option>
                    <option value="keluar">Surat Keluar (Dikirim)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Dokumen
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="proses">Dalam Proses</option>
                    <option value="selesai">Selesai</option>
                    <option value="diarsipkan">Diarsipkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Surat Resmi *
                </label>
                <input
                  type="text"
                  value={letterNumber}
                  onChange={(e) => setLetterNumber(e.target.value)}
                  placeholder="028/BM-DPUPR/SRL/IX/2026"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Surat *
                  </label>
                  <input
                    type="date"
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Diterima / Dikirim *
                  </label>
                  <input
                    type="date"
                    value={receivedOrSentDate}
                    onChange={(e) => setReceivedOrSentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perihal Surat *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Instruksi Percepatan Penanganan Patching Ruas Pauh - Mandiangin"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {type === 'masuk' ? 'Asal Instansi Pengirim *' : 'Tujuan Surat (Penerima) *'}
                </label>
                <input
                  type="text"
                  value={originOrDestination}
                  onChange={(e) => setOriginOrDestination(e.target.value)}
                  placeholder="Contoh: Dinas PUPR Kabupaten Sarolangun / PT Wijaya Karya"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unggah Berkas Lampiran (PDF / Gambar)
                </label>
                <label className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs text-slate-700">
                  <Paperclip className="w-4 h-4 mr-1 text-amber-500" />
                  <span>{attachmentName ? `Ganti: ${attachmentName}` : 'Pilih Berkas Lampiran (PDF / JPG / PNG)'}</span>
                  <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disposisi / Catatan Tindak Lanjut
                </label>
                <textarea
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan Kepala Bidang / PPK, penugasan pengawas teknis..."
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
