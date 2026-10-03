const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const dfShort = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const dfMonth = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' })
const dfDayMonth = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' })
const dfDateTime = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

/** 1250.5 → "1.250,50" */
export const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null || Number.isNaN(Number(n))
    ? '-'
    : digits === 2
      ? nf2.format(Number(n))
      : new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(n))

export const fmtInt = (n: number | null | undefined) => (n == null ? '-' : nf0.format(Number(n)))

/** "YYYY-MM-DD" diparse sebagai tanggal lokal (tanpa geser zona waktu) */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(s)
}

/** "2026-10-03" → "03 Okt 2026" */
export const fmtDate = (s: string | null | undefined) => (s ? dfShort.format(parseDate(s)) : '-')
export const fmtDateTime = (s: string | null | undefined) => (s ? dfDateTime.format(new Date(s)) : '-')
export const fmtMonth = (d: Date) => dfMonth.format(d)
export const fmtDayMonth = (s: string) => dfDayMonth.format(parseDate(s))

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const today = () => toISODate(new Date())

export function startOfMonth(d = new Date()) {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Senin dari minggu tanggal tersebut */
export function startOfWeek(s: string): string {
  const d = parseDate(s)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return toISODate(d)
}

export const monthKey = (s: string) => s.slice(0, 7)
export const fmtMonthKey = (k: string) => fmtMonth(parseDate(`${k}-01`))

export function fmtBytes(n: number | null | undefined) {
  if (!n) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${fmtNum(n / 1024, 1)} KB`
  return `${fmtNum(n / 1024 / 1024, 1)} MB`
}

/** STA "0+100" → meter (100) */
export function staToMeter(sta: string): number {
  const m = /^(\d+)\+(\d{1,3})$/.exec(sta.trim())
  return m ? Number(m[1]) * 1000 + Number(m[2]) : NaN
}

/** Normalisasi STA: "0+50" → "0+050" */
export function normalizeSta(sta: string): string {
  const m = /^(\d+)\+(\d{1,3})$/.exec(sta.trim())
  return m ? `${Number(m[1])}+${m[2].padStart(3, '0')}` : sta.trim()
}

export const fmtSta = (a: string, b: string) => `${a} s/d ${b}`
