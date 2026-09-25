export type UserRole = 'admin' | 'ppk' | 'pelaksana' | 'pengawas';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency: string; // e.g. "Balai Besar Pelaksanaan Jalan Nasional", "PT Wijaya Konstruksi", etc.
  phone: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export type PhotoCondition = '0%' | '50%' | '100%';

export interface PhotoItem {
  id: string;
  condition: PhotoCondition;
  url: string; // data URL or relative URL
  filename: string; // [NamaRuas]_[STA]_[Kondisi]_[Tanggal]_[urutan].jpg
  uploadedAt: string;
  uploadedBy: string;
  caption?: string;
}

export interface ReportHistoryItem {
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface ReviewStatus {
  byUserId: string;
  byUserName: string;
  role: 'pengawas' | 'ppk';
  timestamp: string;
  status: 'approved' | 'rejected' | 'revision';
  notes: string;
}

export interface PatchingReport {
  id: string;
  roadName: string;
  side: 'Kiri' | 'Kanan' | 'Tengah' | 'Kedua Sisi (Full)';
  staStart: string; // e.g. "0+100"
  staEnd: string;   // e.g. "0+150"
  lengthM: number;  // Panjang (m)
  widthM: number;   // Lebar (m)
  thicknessCm: number; // Tebal (cm)
  volumeM3: number; // Volume (m³) = P x L x (T / 100)
  tonnageTon: number; // Estimasi Tonase = Volume x 2.3
  damageType: string; // Jenis kerusakan: Lubang, Retak Buaya, Amblas, Pelepasan Butir
  notes: string;
  weather: 'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat';
  date: string;     // YYYY-MM-DD
  progressPercent: 0 | 50 | 100;
  photos: PhotoItem[];
  status: 'Draft' | 'Menunggu Verifikasi Pengawas' | 'Diverifikasi Pengawas' | 'Disetujui PPK' | 'Perlu Revisi';
  pengawasReview?: ReviewStatus;
  ppkApproval?: ReviewStatus;
  createdBy: {
    id: string;
    name: string;
    role: UserRole;
    agency: string;
  };
  createdAt: string;
  updatedAt: string;
  history: ReportHistoryItem[];
}

export interface LetterItem {
  id: string;
  letterNumber: string;
  letterDate: string;
  receivedOrSentDate: string;
  type: 'masuk' | 'keluar';
  subject: string;
  originOrDestination: string; // Pengirim / Penerima
  attachmentName?: string;
  attachmentData?: string; // base64 or file reference
  attachmentType?: string;
  status: 'proses' | 'selesai' | 'diarsipkan';
  dispositionNotes?: string;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MaterialTransaction {
  id: string;
  materialName: string;
  date: string;
  type: 'masuk' | 'keluar' | 'pakai';
  amount: number;
  unit: 'Ton' | 'm³' | 'Drum' | 'Zak' | 'Liter' | 'Kg';
  sourceOrDestination: string; // e.g. AMP PT Bina Mitra / Titik Proyek
  roadName?: string; // Ruas jalan jika jenis pakai
  staLocation?: string;
  waybillNumber?: string; // No. Surat Jalan / No. Tiket Timbangan
  notes?: string;
  proofPhotoName?: string;
  proofPhotoData?: string;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface EquipmentLog {
  id: string;
  equipmentName: string;
  equipmentType: string;
  equipmentCode: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakMinutes: number;
  totalHours: number; // calculated hours
  roadName: string;
  locationSta: string;
  operatorName: string;
  status: 'Beroperasi Normal' | 'Standby' | 'Perbaikan / Rusak' | 'Terkendala Cuaca';
  notes?: string;
  fuelAddedLiters?: number;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: 'Autentikasi' | 'Laporan Patching' | 'Surat Masuk & Keluar' | 'Material Jalan' | 'Jam Alat Berat' | 'Manajemen Pengguna' | 'Sistem & Backup';
  action: 'LOGIN' | 'LOGOUT' | 'TAMBAH' | 'EDIT' | 'HAPUS' | 'VERIFIKASI_PENGAWAS' | 'APPROVAL_PPK' | 'RESET_PASSWORD' | 'BACKUP_DATA' | 'RESTORE_DATA';
  description: string;
  targetId?: string;
  ipAddress?: string;
}

export interface MaterialStockSummary {
  materialName: string;
  unit: string;
  totalMasuk: number;
  totalKeluar: number;
  totalPakai: number;
  currentStock: number;
  lastUpdated: string;
}
