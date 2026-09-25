import React from 'react';
import { User, UserRole } from '../types';
import {
  HardHat,
  LayoutDashboard,
  Hammer,
  Package,
  Clock,
  Mail,
  ShieldCheck,
  Users,
  LogOut,
  HelpCircle,
  RefreshCw,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  availableUsers: User[];
  onSwitchUser: (user: User) => void;
  onRefreshData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  availableUsers,
  onSwitchUser,
  onRefreshData,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'ADMINISTRATOR', bg: 'bg-purple-900/80 text-purple-100 border-purple-400/50' };
      case 'ppk':
        return { label: 'PPK (PEJABAT PEMBUAT KOMITMEN)', bg: 'bg-blue-800 text-blue-100 border-blue-400/50' };
      case 'pengawas':
        return { label: 'PENGAWAS LAPANGAN (KONSULTAN)', bg: 'bg-emerald-800 text-emerald-100 border-emerald-400/50' };
      case 'pelaksana':
        return { label: 'PELAKSANA (KONTRAKTOR)', bg: 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold' };
    }
  };

  const currentRole = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="sticky top-0 z-40 bg-[#0f2347] shadow-md border-b border-[#1e3a8a] text-white">
      {/* Top Banner with Project Context & Role Switcher */}
      <div className="border-b border-[#1e3a8a]/70 px-4 py-2 bg-[#0a192f] text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-bold text-white tracking-wide">SISTEM MONITORING PRESERVASI &amp; PATCHING JALAN</span>
            <span className="hidden sm:inline text-[#3b82f6]">|</span>
            <span className="hidden sm:inline text-amber-300 font-medium">DPUPR Kabupaten Sarolangun</span>
          </div>

          {/* Quick Demo Role Switcher */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <span className="text-slate-300 hidden md:inline text-[11px]">Ganti Akun Demo:</span>
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e3a8a] hover:bg-[#2563eb] text-white border border-[#3b82f6] font-medium transition shadow-sm"
                  title="Ganti akun untuk menguji perbedaan hak akses"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="capitalize text-amber-200">{currentUser.role}</span>: {currentUser.name.split(' ')[0]}
                  <span className="text-[10px] text-amber-300">▼</span>
                </button>

                {roleMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-72 rounded-lg bg-white text-slate-900 border border-slate-300 shadow-2xl z-50 p-2 text-left"
                    onMouseLeave={() => setRoleMenuOpen(false)}
                  >
                    <div className="text-[11px] font-bold text-[#0f2347] px-2 py-1 border-b border-slate-200 mb-1">
                      PILIH HAK AKSES UNTUK EVALUASI:
                    </div>
                    {availableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded text-xs transition flex items-center justify-between gap-2 ${
                          currentUser.id === u.id
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'text-slate-700 hover:bg-blue-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold uppercase tracking-wider text-[10px] text-[#1e3a8a]">{u.role}</div>
                          <div className="truncate font-semibold">{u.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{u.agency}</div>
                        </div>
                        {currentUser.id === u.id && <span className="text-amber-600 text-xs font-bold">✓ Aktif</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={onRefreshData}
                title="Refresh data dari server"
                className="p-1 rounded bg-[#1e3a8a] hover:bg-[#2563eb] text-white border border-[#3b82f6] transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/20 border-2 border-amber-300">
            <HardHat className="w-6 h-6 text-[#0f2347] stroke-[2.4]" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
              <span className="text-white">Bidang Bina Marga DPUPR Kab. Sarolangun</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-400 text-[#0f2347] font-bold border border-amber-300 shrink-0">
                PRO-V2
              </span>
            </div>
            <div className="text-xs text-amber-200/90 font-medium">Monitoring &amp; Pelaporan Harian Konstruksi &amp; Preservasi Jalan</div>
          </div>
        </div>

        {/* User Card & Logout */}
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-white">{currentUser.name}</div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${currentRole?.bg}`}>
                  {currentRole?.label}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Navigation Tabs */}
      {currentUser && (
        <div className="border-t border-[#1e3a8a] px-4 bg-[#0a192f] hidden md:block">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto py-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Progres</span>
            </button>

            <button
              onClick={() => setActiveTab('patching')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'patching'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>Laporan Patching Jalan</span>
            </button>

            <button
              onClick={() => setActiveTab('material')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'material'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Material Jalan &amp; Stok</span>
            </button>

            <button
              onClick={() => setActiveTab('alat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'alat'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Jam Kerja Alat Berat</span>
            </button>

            <button
              onClick={() => setActiveTab('surat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'surat'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Surat Masuk &amp; Keluar</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                  : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Trail (Log)</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-amber-400 text-[#0f2347] shadow-sm shadow-amber-400/40 ring-1 ring-amber-300'
                    : 'text-slate-200 hover:text-white hover:bg-[#1e3a8a]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Kelola User &amp; Peran</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('panduan')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ml-auto ${
                activeTab === 'panduan'
                  ? 'bg-white text-[#0f2347] shadow-sm'
                  : 'text-amber-300 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Panduan Multi-User &amp; VPS</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
