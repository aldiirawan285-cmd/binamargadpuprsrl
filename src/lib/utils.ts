import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(err: unknown): string {
  if (!err) return 'Terjadi kesalahan'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err && 'message' in err) return String((err as { message: unknown }).message)
  return 'Terjadi kesalahan'
}

/** Nama file aman untuk path storage / ZIP */
export function safeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-+ ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120) || 'file'
}

export function uid(): string {
  return crypto.randomUUID()
}
