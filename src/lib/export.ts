import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { saveBlob } from '@/lib/storage'

export interface ExportColumn<T> {
  header: string
  /** Nilai mentah untuk CSV */
  csv: (row: T) => string | number | null | undefined
  /** Nilai terformat untuk PDF (default: csv) */
  pdf?: (row: T) => string
  align?: 'left' | 'right' | 'center'
}

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV. Pemisah `;` dan angka desimal koma agar langsung terbaca benar
 * oleh Excel ber-locale Indonesia. BOM UTF-8 ditambahkan untuk karakter khusus.
 */
export function exportCSV<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const lines = [columns.map((c) => csvCell(c.header)).join(';')]
  for (const r of rows) {
    lines.push(
      columns
        .map((c) => {
          const v = c.csv(r)
          return csvCell(typeof v === 'number' ? String(v).replace('.', ',') : v)
        })
        .join(';'),
    )
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  saveBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export interface PdfImageGroup {
  title: string
  sections: { label: string; images: { data: string; w: number; h: number }[] }[]
}

export interface PdfOptions<T> {
  filename: string
  title: string
  periode?: { dari?: string; sampai?: string }
  filterInfo?: string[]
  columns: ExportColumn<T>[]
  rows: T[]
  summary?: [string, string][]
  imageGroups?: PdfImageGroup[]
  landscape?: boolean
}

const KOP = {
  instansi: 'PEMERINTAH KABUPATEN SAROLANGUN',
  dinas: 'DINAS PEKERJAAN UMUM DAN PENATAAN RUANG',
  bidang: 'BIDANG BINA MARGA',
}

export function exportPDF<T>(opt: PdfOptions<T>) {
  const doc = new jsPDF({ orientation: opt.landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 12

  // Kop laporan
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(KOP.instansi, pageW / 2, 14, { align: 'center' })
  doc.text(KOP.dinas, pageW / 2, 20, { align: 'center' })
  doc.setFontSize(11)
  doc.text(KOP.bidang, pageW / 2, 26, { align: 'center' })
  doc.setLineWidth(0.8)
  doc.line(margin, 30, pageW - margin, 30)
  doc.setLineWidth(0.2)
  doc.line(margin, 31.2, pageW - margin, 31.2)

  doc.setFontSize(13)
  doc.text(opt.title.toUpperCase(), pageW / 2, 39, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  let y = 45
  const per = opt.periode
  const periodeText =
    per?.dari || per?.sampai ? `${per.dari ? fmtDate(per.dari) : 'awal'} s/d ${per.sampai ? fmtDate(per.sampai) : 'sekarang'}` : 'Semua periode'
  doc.text(`Periode: ${periodeText}`, margin, y)
  doc.text(`Dicetak: ${fmtDateTime(new Date().toISOString())}`, pageW - margin, y, { align: 'right' })
  for (const f of opt.filterInfo ?? []) {
    y += 5
    doc.text(f, margin, y)
  }

  autoTable(doc, {
    startY: y + 4,
    head: [['No', ...opt.columns.map((c) => c.header)]],
    body: opt.rows.map((r, i) => [String(i + 1), ...opt.columns.map((c) => (c.pdf ? c.pdf(r) : String(c.csv(r) ?? '')))]),
    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: Object.fromEntries([
      [0, { halign: 'center', cellWidth: 8 }],
      ...opt.columns.map((c, i) => [i + 1, { halign: c.align ?? 'left' }]),
    ]),
    margin: { left: margin, right: margin },
  })

  // Rekap total
  if (opt.summary?.length) {
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    autoTable(doc, {
      startY: lastY + 6,
      head: [['Rekapitulasi', 'Nilai']],
      body: opt.summary,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      tableWidth: 110,
      margin: { left: margin },
    })
  }

  // Lampiran foto per tahap
  if (opt.imageGroups?.length) {
    doc.addPage()
    let cy = 16
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('DOKUMENTASI FOTO', pageW / 2, cy, { align: 'center' })
    cy += 8
    const thumbH = 32
    for (const g of opt.imageGroups) {
      if (cy + 12 > pageH - margin) {
        doc.addPage()
        cy = 16
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text(g.title, margin, cy)
      cy += 4
      for (const s of g.sections) {
        if (cy + thumbH + 8 > pageH - margin) {
          doc.addPage()
          cy = 16
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.text(`Progres ${s.label}${s.images.length ? '' : ' — (belum ada foto)'}`, margin, cy + 3)
        cy += 5
        if (!s.images.length) continue
        let x = margin
        for (const img of s.images) {
          const w = (img.w / img.h) * thumbH
          if (x + w > pageW - margin) {
            x = margin
            cy += thumbH + 3
            if (cy + thumbH > pageH - margin) {
              doc.addPage()
              cy = 16
            }
          }
          doc.addImage(img.data, 'JPEG', x, cy, w, thumbH)
          x += w + 3
        }
        cy += thumbH + 4
      }
      cy += 3
    }
  }

  // Nomor halaman
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Halaman ${i} dari ${total}`, pageW - margin, pageH - 6, { align: 'right' })
    doc.setTextColor(0)
  }

  doc.save(opt.filename.endsWith('.pdf') ? opt.filename : `${opt.filename}.pdf`)
}
