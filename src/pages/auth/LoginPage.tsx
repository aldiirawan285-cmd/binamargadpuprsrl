import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from './AuthShell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Email atau kata sandi salah'
          : error.message === 'Email not confirmed'
            ? 'Email belum dikonfirmasi. Periksa kotak masuk Anda.'
            : error.message,
      )
    } else {
      toast.success('Berhasil masuk')
    }
  }

  return (
    <AuthShell title="Masuk" description="Gunakan email dan kata sandi yang terdaftar.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Masuk
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-medium text-primary underline-offset-4 hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
