import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  HardHat,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  AlertCircle,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  Users
} from 'lucide-react';
import { api } from '../services/api';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  availableDemoUsers: User[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  availableDemoUsers,
}) => {
  const [email, setEmail] = useState('pelaksana@kontraktor-jaya.co.id');
  const [password, setPassword] = useState('Pelaksana123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoUser = (user: User) => {
    setEmail(user.email);
    // Standard passwords
    if (user.role === 'admin') setPassword('Admin123!');
    else if (user.role === 'ppk') setPassword('Ppk123!');
    else if (user.role === 'pengawas') setPassword('Pengawas123!');
    else setPassword('Pelaksana123!');
    setErrorMessage('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotResult(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses permintaan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Road Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-400 items-center justify-center shadow-md shadow-amber-400/30 border-2 border-amber-300">
            <HardHat className="w-8 h-8 text-[#0f2347] stroke-[2.4]" />
          </div>
          <h1 className="text-xl font-black text-[#0f2347] tracking-tight leading-snug">
            Bidang Bina Marga DPUPR Kab. Sarolangun
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Sistem Monitoring &amp; Pelaporan Harian Konstruksi &amp; Preservasi Jalan
          </p>
        </div>

        {/* Demo Quick Logins */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider text-center">
            Pilih Akun Demo untuk Masuk Cepat:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {availableDemoUsers.map((u) => {
              const isSelected = email.toLowerCase() === u.email.toLowerCase();
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectDemoUser(u)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    isSelected
                      ? 'bg-amber-100 border-amber-400 text-[#0f2347] font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#1e3a8a] font-bold">
                    {u.role}
                  </div>
                  <div className="truncate font-semibold">{u.name.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form or Forgot Password Form */}
        {!forgotMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setForgotEmail(email);
                    setForgotResult('');
                  }}
                  className="text-[11px] text-[#1e3a8a] hover:text-[#2563eb] font-semibold"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#0f2347] font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-400/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0f2347]">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Bantuan Lupa Kata Sandi</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Masukkan alamat email Anda. Sistem akan mencatat permintaan reset untuk disahkan oleh Administrator.
            </p>

            {forgotResult ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{forgotResult}</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Terdaftar
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                ← Kembali ke Login
              </button>
              {!forgotResult && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] font-bold text-xs shadow-sm"
                >
                  Kirim Permintaan
                </button>
              )}
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400 font-mono">
          Bina Marga Preservasi · Standar Spesifikasi Umum 2020 Rev 2
        </div>
      </div>
    </div>
  );
};
