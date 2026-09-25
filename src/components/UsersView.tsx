import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  Users,
  UserPlus,
  Key,
  Shield,
  Trash2,
  Edit2,
  X,
  Check,
  Download,
  Upload,
  RefreshCw,
  Database,
  Lock,
  Phone,
  Building
} from 'lucide-react';
import { api } from '../services/api';
import { downloadBlob } from '../utils/exportUtils';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onRefreshUsers: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onRefreshUsers,
  onShowToast,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Add form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('pelaksana');
  const [agency, setAgency] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backup / Restore states
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createUser(
        { name, email, role, agency, phone, password },
        currentUser.id
      );
      onShowToast('success', `Pengguna ${name} (${role.toUpperCase()}) berhasil dibuat!`);
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setAgency('');
      setPhone('');
      onRefreshUsers();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menambahkan pengguna');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPasswordInput.trim()) return;
    setIsSubmitting(true);
    try {
      await api.resetUserPassword(selectedUserForReset.id, newPasswordInput, currentUser.id);
      onShowToast('success', `Kata sandi untuk ${selectedUserForReset.name} berhasil direset!`);
      setIsResetModalOpen(false);
      setNewPasswordInput('');
      setSelectedUserForReset(null);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset kata sandi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      onShowToast('error', 'Anda tidak dapat menghapus akun Anda sendiri');
      return;
    }
    if (!confirm(`Yakin ingin menghapus pengguna "${user.name}" (${user.email})?`)) return;

    try {
      await api.deleteUser(user.id, currentUser.id);
      onShowToast('success', `Pengguna ${user.name} berhasil dihapus.`);
      onRefreshUsers();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menghapus pengguna');
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const data = await api.downloadBackup(currentUser.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      downloadBlob(blob, `backup_monitoring_jalan_${new Date().toISOString().split('T')[0]}.json`);
      onShowToast('success', 'Cadangan database sistem berhasil diunduh.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mengunduh backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Memulihkan database akan menimpa seluruh data saat ini dengan data cadangan. Lanjutkan?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        await api.restoreBackup(parsed, currentUser.id);
        onShowToast('success', 'Database berhasil dipulihkan dari cadangan!');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        onShowToast('error', 'Format berkas backup tidak valid: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    if (!confirm('Kembalikan semua data ke data demonstrasi standar?')) return;
    try {
      await api.resetDemoData(currentUser.id);
      onShowToast('success', 'Data sistem berhasil di-reset ke data demo standar.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal reset data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Manajemen Pengguna, Hak Akses &amp; Database
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Kelola 4 peran utama (Admin, PPK, Pelaksana, Pengawas), reset kata sandi, dan cadangan database sistem Bidang Bina Marga DPUPR Kab. Sarolangun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            + Tambah Pengguna Baru
          </button>
        </div>
      </div>

      {/* Role Access Matrix Guide */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider mb-2">
          Matriks Hak Akses Peran Sistem (Role-Based Access Control)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <span className="font-bold text-purple-900 block mb-1">👑 ADMINISTRATOR</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Akses menyeluruh: kelola user, konfigurasi sistem, edit/hapus semua modul, backup &amp; restore database pusat.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <span className="font-bold text-[#1e3a8a] block mb-1">📋 PPK (KOMITMEN)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Melihat seluruh data, verifikasi &amp; sahkan laporan opname volume, unduh rekap Excel &amp; ZIP foto. Tidak input data lapangan.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="font-bold text-emerald-900 block mb-1">🔍 PENGAWAS (SUPERVISI)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Review mutu lapangan, verifikasi ketebalan/suhu, beri catatan rekomendasi/revisi, dan input laporan pengawasan.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-300">
            <span className="font-bold text-amber-900 block mb-1">👷 PELAKSANA (KONTRAKTOR)</span>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Input harian patching, upload foto (0%, 50%, 100%), transaksi material keluar/pakai, dan log jam kerja alat berat.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-[#0f2347]">
            Daftar Pengguna Terdaftar ({users.length} Akun)
          </span>
          <button
            onClick={onRefreshUsers}
            className="text-xs text-[#1e3a8a] hover:text-[#2563eb] flex items-center gap-1 font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-[#0f2347] border-b border-[#1e3a8a] text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email Login</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Instansi / Perusahaan</th>
                <th className="py-3 px-4">No. HP</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const roleBadge =
                  u.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : u.role === 'ppk'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : u.role === 'pengawas'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300';

                return (
                  <tr key={u.id} className="hover:bg-blue-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-[#0f2347] whitespace-nowrap">
                      {u.name}
                      {u.id === currentUser.id && (
                        <span className="text-[10px] text-amber-600 ml-1.5 font-bold">(Anda)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roleBadge}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{u.agency}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {u.phone || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Belum pernah'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setNewPasswordInput('Baru123!');
                            setIsResetModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 text-[#0f2347] text-[11px] font-bold border border-slate-300 flex items-center gap-1 transition"
                          title="Reset Password Pengguna"
                        >
                          <Key className="w-3 h-3 text-amber-600" /> Reset Sandi
                        </button>
                        {u.id !== 'usr-admin-1' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-300 transition"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup & System Maintenance Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          Pemeliharaan Sistem &amp; Cadangan Database (Backup &amp; Restore)
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Untuk keandalan operasional multi-user, backup snapshot database relasional dapat diunduh kapan saja atau dipulihkan kembali saat migrasi server.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="px-4 py-2 rounded-lg bg-[#0f2347] hover:bg-[#1e3a8a] text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-amber-400" />
            {isBackingUp ? 'Membuat Cadangan...' : 'Unduh Backup Database (JSON Snapshot)'}
          </button>

          <label className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Pulihkan Database dari Berkas</span>
            <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
          </label>

          <button
            onClick={handleResetDemo}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset ke Data Awal Demo
          </button>
        </div>
      </div>

      {/* Modal Add User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#0f2347] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                Tambah Pengguna Sistem Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ir. Ahmad Fauzi, S.T."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Login *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran / Hak Akses (Role) *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400"
                >
                  <option value="pelaksana">Pelaksana (Input Harian &amp; Foto)</option>
                  <option value="pengawas">Pengawas (Supervisi &amp; Verifikasi)</option>
                  <option value="ppk">PPK (Persetujuan &amp; Download Rekap)</option>
                  <option value="admin">Administrator (Akses Penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instansi / Nama Perusahaan
                </label>
                <input
                  type="text"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="DPUPR Kab. Sarolangun / PT Konstruksi Mitra"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Awal *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password by Admin */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Reset Kata Sandi Pengguna
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-700">
                Atur ulang kata sandi untuk <strong className="text-[#0f2347]">{selectedUserForReset.name}</strong> ({selectedUserForReset.email}):
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
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
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
