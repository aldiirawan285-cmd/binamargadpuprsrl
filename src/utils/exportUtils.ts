import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { PatchingReport, LetterItem, MaterialTransaction, EquipmentLog, AuditLog, PhotoItem } from '../types';

export function exportPatchingToExcel(reports: PatchingReport[], filename = 'Rekap_Pekerjaan_Patching_Jalan.xlsx') {
  const data = reports.map((r, idx) => ({
    'No': idx + 1,
    'Tanggal': r.date,
    'Nama Ruas Jalan': r.roadName,
    'Sisi': r.side,
    'STA Awal': `STA ${r.staStart}`,
    'STA Akhir': `STA ${r.staEnd}`,
    'Panjang (m)': r.lengthM,
    'Lebar (m)': r.widthM,
    'Tebal (cm)': r.thicknessCm,
    'Volume (m³)': r.volumeM3,
    'Estimasi Tonase (Ton)': r.tonnageTon,
    'Jenis Kerusakan': r.damageType,
    'Progres': `${r.progressPercent}%`,
    'Status': r.status,
    'Pelaksana': r.createdBy.name,
    'Instansi / Perusahaan': r.createdBy.agency,
    'Jumlah Foto': r.photos.length,
    'Verifikasi Pengawas': r.pengawasReview ? `${r.pengawasReview.status.toUpperCase()} (${r.pengawasReview.byUserName})` : 'Belum',
    'Approval PPK': r.ppkApproval ? `${r.ppkApproval.status.toUpperCase()} (${r.ppkApproval.byUserName})` : 'Belum',
    'Keterangan': r.notes,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Patching');
  XLSX.writeFile(workbook, filename);
}

export function exportPatchingToCSV(reports: PatchingReport[], filename = 'Rekap_Pekerjaan_Patching_Jalan.csv') {
  const headers = [
    'No',
    'Tanggal',
    'Nama Ruas Jalan',
    'Sisi',
    'STA Awal',
    'STA Akhir',
    'Panjang (m)',
    'Lebar (m)',
    'Tebal (cm)',
    'Volume (m3)',
    'Estimasi Tonase (Ton)',
    'Jenis Kerusakan',
    'Progres',
    'Status',
    'Pelaksana',
    'Keterangan'
  ];

  const rows = reports.map((r, i) => [
    i + 1,
    `"${r.date}"`,
    `"${r.roadName.replace(/"/g, '""')}"`,
    `"${r.side}"`,
    `"STA ${r.staStart}"`,
    `"STA ${r.staEnd}"`,
    r.lengthM,
    r.widthM,
    r.thicknessCm,
    r.volumeM3,
    r.tonnageTon,
    `"${r.damageType}"`,
    `"${r.progressPercent}%"`,
    `"${r.status}"`,
    `"${r.createdBy.name.replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportLettersToExcel(letters: LetterItem[], filename = 'Rekap_Surat_Masuk_Keluar.xlsx') {
  const data = letters.map((l, idx) => ({
    'No': idx + 1,
    'Nomor Surat': l.letterNumber,
    'Jenis': l.type === 'masuk' ? 'Surat Masuk' : 'Surat Keluar',
    'Tanggal Surat': l.letterDate,
    'Tanggal Terima/Kirim': l.receivedOrSentDate,
    'Perihal': l.subject,
    'Asal / Tujuan': l.originOrDestination,
    'Status': l.status.toUpperCase(),
    'Disposisi / Tindak Lanjut': l.dispositionNotes || '-',
    'Lampiran': l.attachmentName || 'Tidak Ada',
    'Dicatat Oleh': l.createdBy.name,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenda Surat');
  XLSX.writeFile(workbook, filename);
}

export function exportMaterialToExcel(materials: MaterialTransaction[], filename = 'Rekap_Transaksi_Material.xlsx') {
  const data = materials.map((m, idx) => ({
    'No': idx + 1,
    'Tanggal': m.date,
    'Nama Material': m.materialName,
    'Jenis Transaksi': m.type.toUpperCase(),
    'Jumlah': m.amount,
    'Satuan': m.unit,
    'Sumber / Tujuan': m.sourceOrDestination,
    'Ruas Jalan Terkait': m.roadName || '-',
    'Lokasi STA': m.staLocation || '-',
    'No. Surat Jalan/Tiket': m.waybillNumber || '-',
    'Keterangan': m.notes || '-',
    'Petugas': m.createdBy.name,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi Material');
  XLSX.writeFile(workbook, filename);
}

export function exportEquipmentToExcel(logs: EquipmentLog[], filename = 'Rekap_Jam_Kerja_Alat_Berat.xlsx') {
  const data = logs.map((e, idx) => ({
    'No': idx + 1,
    'Tanggal': e.date,
    'Nama Alat': e.equipmentName,
    'Kode Alat': e.equipmentCode,
    'Tipe Alat': e.equipmentType,
    'Jam Mulai': e.startTime,
    'Jam Selesai': e.endTime,
    'Istirahat (Menit)': e.breakMinutes,
    'Total Jam Operasi': e.totalHours,
    'BBM Tambahan (Liter)': e.fuelAddedLiters || 0,
    'Ruas Jalan / Lokasi': e.roadName,
    'Titik STA': e.locationSta,
    'Operator': e.operatorName,
    'Status Alat': e.status,
    'Keterangan / Kendala': e.notes || '-',
    'Pelaksana': e.createdBy.name,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jam Alat');
  XLSX.writeFile(workbook, filename);
}

export function exportAuditLogsToExcel(logs: AuditLog[], filename = 'Audit_Trail_Log_Aktivitas.xlsx') {
  const data = logs.map((l, idx) => ({
    'No': idx + 1,
    'Waktu': new Date(l.timestamp).toLocaleString('id-ID'),
    'Pengguna': l.userName,
    'Peran': l.userRole.toUpperCase(),
    'Modul': l.module,
    'Aksi': l.action,
    'Detail Perubahan': l.description,
    'ID Target': l.targetId || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');
  XLSX.writeFile(workbook, filename);
}

/**
 * Bulk ZIP download for photos with custom filtering:
 * Filename pattern: [NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg
 */
export async function downloadPhotosAsZip(
  reports: PatchingReport[],
  filter?: { roadName?: string; condition?: string; date?: string },
  zipFilename = 'Foto_Dokumentasi_Pekerjaan_Jalan.zip'
): Promise<number> {
  const zip = new JSZip();
  let count = 0;

  for (const report of reports) {
    if (filter?.roadName && filter.roadName !== 'Semua' && report.roadName !== filter.roadName) {
      continue;
    }
    if (filter?.date && report.date !== filter.date) {
      continue;
    }

    const cleanRoad = report.roadName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanSta = `STA${report.staStart.replace('+', '')}-${report.staEnd.replace('+', '')}`;
    const dateStr = report.date.replace(/-/g, '');

    const photosByCondition: { [key: string]: PhotoItem[] } = {};
    for (const p of report.photos) {
      if (filter?.condition && filter.condition !== 'Semua' && p.condition !== filter.condition) {
        continue;
      }
      if (!photosByCondition[p.condition]) {
        photosByCondition[p.condition] = [];
      }
      photosByCondition[p.condition].push(p);
    }

    for (const [cond, photos] of Object.entries(photosByCondition)) {
      const folderName = `${cleanRoad}/${cleanSta}/${cond}`;
      const folder = zip.folder(folderName) || zip;

      photos.forEach((photo, idx) => {
        // Enforce pattern: [NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg
        const standardizedName = `${cleanRoad}_${cleanSta}_${cond}_${dateStr}_${idx + 1}.jpg`;
        const base64Data = photo.url.split(',')[1];
        if (base64Data) {
          folder.file(standardizedName, base64Data, { base64: true });
          count++;
        }
      });
    }
  }

  if (count === 0) {
    return 0;
  }

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipFilename);
  return count;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
