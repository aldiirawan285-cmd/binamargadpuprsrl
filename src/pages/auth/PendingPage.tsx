import { useState } from 'react'
import { Clock, Ban, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { AuthShell } from './AuthShell'

export default function PendingPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const nonaktif = profile && profile.is_active === false

  return (
    <AuthShell title={nonaktif ? 'Akun dinonaktifkan' : 'Menunggu persetujuan'}>
      <div className="space-y-4 text-sm">
        {nonaktif ? <Ban className="h-10 w-10 text-destructive" /> : <Clock className="h-10 w-10 text-primary" />}
        <p className="text-base font-medium">
          {nonaktif
            ? 'Akun Anda telah dinonaktifkan oleh admin. Hubungi admin untuk mengaktifkan kembali.'
            : 'Akun Anda sedang menunggu persetujuan admin.'}
        </p>
        <div className="rounded-md bg-muted p-3">
          <div className="font-medium">{profile?.nama_lengkap || '-'}</div>
          <div className="text-muted-foreground">{profile?.email}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await refreshProfile()
              setBusy(false)
            }}
          >
            <RefreshCw className={busy ? 'animate-spin' : ''} /> Periksa lagi
          </Button>
          <Button variant="secondary" className="flex-1" onClick={signOut}>
            <LogOut /> Keluar
          </Button>
        </div>
      </div>
    </AuthShell>
  )
}
