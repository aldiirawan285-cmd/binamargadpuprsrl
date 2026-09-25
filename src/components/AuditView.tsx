import React, { useState, useMemo } from 'react';
import { AuditLog } from '../types';
import {
  ShieldCheck,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  User,
  Activity,
  Layers,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import { exportAuditLogsToExcel } from '../utils/exportUtils';

interface AuditViewProps {
  logs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const [filterModule, setFilterModule] = useState('Semua');
  const [filterAction, setFilterAction] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterModule !== 'Semua' && l.module !== filterModule) return false;
      if (filterAction !== 'Semua' && l.action !== filterAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.userName.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, filterModule, filterAction, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Audit Trail &amp; Log Aktivitas Sistem
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pencatatan rekam jejak setiap aksi pengguna (siapa, kapan, modul, dan detail perubahan data) Bidang Bina Marga DPUPR Kab. Sarolangun.
          </p>
        </div>

        <button
          onClick={() => exportAuditLogsToExcel(filtered)}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
          Export Log Excel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari user / kata kunci deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="Semua">Semua Modul</option>
            <option value="Autentikasi">Autentikasi</option>
            <option value="Laporan Patching">Laporan Patching</option>
            <option value="Material Jalan">Material Jalan</option>
            <option value="Jam Alat Berat">Jam Alat Berat</option>
            <option value="Surat Masuk & Keluar">Surat Masuk &amp; Keluar</option>
            <option value="Manajemen Pengguna">Manajemen Pengguna</option>
            <option value="Sistem & Backup">Sistem &amp; Backup</option>
          </select>
        </div>

        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="Semua">Semua Aksi</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="TAMBAH">TAMBAH (CREATE)</option>
            <option value="EDIT">EDIT (UPDATE)</option>
            <option value="HAPUS">HAPUS (DELETE)</option>
            <option value="VERIFIKASI_PENGAWAS">VERIFIKASI PENGAWAS</option>
            <option value="APPROVAL_PPK">APPROVAL PPK</option>
            <option value="RESET_PASSWORD">RESET PASSWORD</option>
          </select>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna &amp; Peran</th>
                <th className="py-3 px-4">Modul</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Rincian Perubahan / Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    Tidak ada rekam log aktivitas yang sesuai.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const actionColor =
                    log.action === 'APPROVAL_PPK'
                      ? 'bg-blue-100 text-[#1e3a8a] border-blue-300'
                      : log.action === 'VERIFIKASI_PENGAWAS'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : log.action === 'HAPUS'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : log.action === 'EDIT'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : log.action === 'TAMBAH'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300';

                  return (
                    <tr key={log.id} className="hover:bg-blue-50/60 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#0f2347] font-sans">{log.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">{log.userRole}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-slate-700">
                        {log.module}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-800 text-xs">
                        {log.description}
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
