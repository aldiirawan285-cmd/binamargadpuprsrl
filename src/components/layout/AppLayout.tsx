import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ClipboardList, Mail, Package, Truck, Users, LogOut, Menu, X, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABEL } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brand } from './Brand'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/laporan', label: 'Laporan Pekerjaan', icon: ClipboardList },
  { to: '/surat', label: 'Surat Masuk & Keluar', icon: Mail },
  { to: '/material', label: 'Material Masuk & Keluar', icon: Package },
  { to: '/alat', label: 'Pemakaian Alat', icon: Truck },
  { to: '/admin', label: 'Manajemen User', icon: Users, adminOnly: true },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((n) => !n.adminOnly || profile?.role === 'admin').map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-sidebar-active text-white' : 'hover:bg-white/5',
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const current = NAV.find((n) => pathname.startsWith(n.to))

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <Brand className="h-16 border-b border-white/10 px-4" />
        <SidebarNav />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Brand />
              <button onClick={() => setOpen(false)} className="p-1 cursor-pointer" aria-label="Tutup menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden -ml-2" onClick={() => setOpen(true)} aria-label="Buka menu">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold sm:text-lg">{current?.label ?? 'Monitoring'}</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 text-right sm:flex">
            <UserCircle className="h-8 w-8 text-muted-foreground" />
            <div className="leading-tight">
              <div className="text-sm font-medium">{profile?.nama_lengkap}</div>
              <div className="text-xs text-muted-foreground">{profile?.jabatan || profile?.email}</div>
            </div>
          </div>
          {profile?.role && <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-3 sm:p-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat halaman…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
