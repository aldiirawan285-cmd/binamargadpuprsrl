import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function Field({
  label, htmlFor, required, error, hint, className, children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export type Errors<K extends string = string> = Partial<Record<K, string>>

/** Validasi angka: wajib, tidak negatif */
export function checkNumber(v: string, { required = true, positive = false } = {}): string | undefined {
  if (v.trim() === '') return required ? 'Wajib diisi' : undefined
  const n = Number(v)
  if (Number.isNaN(n)) return 'Harus berupa angka'
  if (n < 0) return 'Tidak boleh negatif'
  if (positive && n === 0) return 'Harus lebih dari 0'
  return undefined
}

export const req = (v: string | null | undefined) => (!v || !v.trim() ? 'Wajib diisi' : undefined)

export function hasErrors(e: Record<string, string | undefined>) {
  return Object.values(e).some(Boolean)
}
