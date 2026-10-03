import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabaseConfigured } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import PendingPage from '@/pages/auth/PendingPage'

const LaporanPage = lazy(() => import('@/pages/laporan/LaporanPage'))
const LaporanDetailPage = lazy(() => import('@/pages/laporan/LaporanDetailPage'))
const SuratPage = lazy(() => import('@/pages/surat/SuratPage'))
const MaterialPage = lazy(() => import('@/pages/material/MaterialPage'))
const AlatPage = lazy(() => import('@/pages/alat/AlatPage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" /> Memuat…
    </div>
  )
}

function ConfigMissing() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md rounded-lg border bg-card p-6 text-sm space-y-2">
        <h1 className="text-lg font-semibold">Konfigurasi Supabase belum diisi</h1>
        <p>
          Salin <code>.env.example</code> menjadi <code>.env</code>, isi <code>VITE_SUPABASE_URL</code> dan{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, lalu jalankan ulang <code>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()

  if (!supabaseConfigured) return <ConfigMissing />
  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/daftar" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!profile || !profile.role || !profile.is_active) {
    return <PendingPage />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="/laporan/:id" element={<LaporanDetailPage />} />
        <Route path="/surat" element={<SuratPage />} />
        <Route path="/material" element={<MaterialPage />} />
        <Route path="/alat" element={<AlatPage />} />
        {profile.role === 'admin' && <Route path="/admin" element={<UsersPage />} />}
        <Route path="*" element={<Navigate to="/laporan" replace />} />
      </Route>
    </Routes>
  )
}
