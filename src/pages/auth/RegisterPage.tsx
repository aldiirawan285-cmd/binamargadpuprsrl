import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from './AuthShell'

export default function RegisterPage() {
  const [form, setForm] = useState({ nama_lengkap: '', jabatan: '', email: '', password: '', konfirmasi: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Kata sandi minimal 8 karakter')
    if (form.password !== form.konfirmasi) return toast.error('Konfirmasi kata sandi tidak sama')
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { nama_lengkap: form.nama_lengkap.trim(), jabatan: form.jabatan.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setBusy(false)
    if (error) return toast.error(error.message === 'User already registered' ? 'Email sudah terdaftar' : error.message)
    toast.success('Pendaftaran berhasil')
    if (!data.session) setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="Periksa email Anda">
        <div className="space-y-4 text-sm">
          <MailCheck className="h-10 w-10 text-primary" />
          <p>
            Kami telah mengirim tautan konfirmasi ke <b>{form.email}</b>. Setelah konfirmasi, akun Anda akan berstatus{' '}
            <b>menunggu persetujuan admin</b> sampai role ditetapkan.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Kembali ke halaman masuk</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Daftar Akun" description="Role akun akan ditetapkan oleh admin setelah pendaftaran.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nama">Nama lengkap *</Label>
          <Input id="nama" required value={form.nama_lengkap} onChange={set('nama_lengkap')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jabatan">Jabatan</Label>
          <Input id="jabatan" placeholder="mis. Pengawas Lapangan" value={form.jabatan} onChange={set('jabatan')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw">Kata sandi *</Label>
            <Input id="pw" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Ulangi kata sandi *</Label>
            <Input id="pw2" type="password" autoComplete="new-password" required value={form.konfirmasi} onChange={set('konfirmasi')} />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Daftar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
