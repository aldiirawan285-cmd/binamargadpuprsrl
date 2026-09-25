import { User, PatchingReport, LetterItem, MaterialTransaction, EquipmentLog, AuditLog } from '../types';

export const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'usr-admin-1',
    name: 'Budi Santoso, S.T., M.Eng.',
    email: 'admin@pupr-jalan.go.id',
    passwordHash: 'Admin123!',
    role: 'admin',
    agency: 'Bidang Bina Marga DPUPR Kab. Sarolangun',
    phone: '0812-3456-7890',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
    lastLogin: '2026-09-25T08:30:00.000Z',
  },
  {
    id: 'usr-ppk-1',
    name: 'Ir. Bambang Hermanto, M.T.',
    email: 'ppk@pupr-jalan.go.id',
    passwordHash: 'Ppk123!',
    role: 'ppk',
    agency: 'PPK Bidang Bina Marga DPUPR Kab. Sarolangun',
    phone: '0813-8899-7711',
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
    lastLogin: '2026-09-25T07:45:00.000Z',
  },
  {
    id: 'usr-pelaksana-1',
    name: 'Hendra Wijaya, S.T.',
    email: 'pelaksana@kontraktor-jaya.co.id',
    passwordHash: 'Pelaksana123!',
    role: 'pelaksana',
    agency: 'PT Sarolangun Jaya Konstruksi',
    phone: '0857-1122-3344',
    status: 'active',
    createdAt: '2026-09-05T09:00:00.000Z',
    lastLogin: '2026-09-25T09:05:00.000Z',
  },
  {
    id: 'usr-pengawas-1',
    name: 'Dian Prasetyo, S.T.',
    email: 'pengawas@konsultan-reka.co.id',
    passwordHash: 'Pengawas123!',
    role: 'pengawas',
    agency: 'PT Rekayasa Konsultan Sarolangun',
    phone: '0819-5566-7788',
    status: 'active',
    createdAt: '2026-09-05T09:15:00.000Z',
    lastLogin: '2026-09-25T08:50:00.000Z',
  }
];

// Placeholder SVG data URIs for realistic construction photos
export const SAMPLE_PHOTOS = {
  zeroPercent: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23475569"/><circle cx="300" cy="220" r="90" fill="%231e293b"/><path d="M220,180 Q320,120 380,240 Q300,310 220,180" fill="%230f172a"/><text x="300" y="70" fill="%23f8fafc" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">KONDISI 0% (SEBELUM PATCHING)</text><text x="300" y="105" fill="%23fca5a5" font-size="16" font-family="sans-serif" text-anchor="middle">Lubang Terbuka &amp; Retak Buaya Jalan</text><rect x="40" y="330" width="520" height="45" rx="6" fill="%230f172ae6"/><text x="55" y="358" fill="%23fbbf24" font-size="13" font-family="monospace">WATERMARK: RUAS A | STA 0+100 - 0+150 | TGL: 2026-09-25</text></svg>',
  fiftyPercent: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23334155"/><rect x="180" y="140" width="240" height="150" fill="%231e293b" stroke="%23f59e0b" stroke-width="4"/><text x="300" y="70" fill="%23f8fafc" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">KONDISI 50% (PROGRES PENGERJAAN)</text><text x="300" y="105" fill="%23fde047" font-size="16" font-family="sans-serif" text-anchor="middle">Cutting, Pembersihan &amp; Semprot Tack Coat</text><rect x="40" y="330" width="520" height="45" rx="6" fill="%230f172ae6"/><text x="55" y="358" fill="%23fbbf24" font-size="13" font-family="monospace">WATERMARK: RUAS A | STA 0+100 - 0+150 | TGL: 2026-09-25</text></svg>',
  hundredPercent: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><rect x="170" y="130" width="260" height="160" fill="%2309090b" stroke="%2310b981" stroke-width="5"/><circle cx="210" cy="270" r="14" fill="%2310b981"/><text x="300" y="70" fill="%23f8fafc" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">KONDISI 100% (SELESAI PEMADATAN)</text><text x="300" y="105" fill="%2386efac" font-size="16" font-family="sans-serif" text-anchor="middle">Gelar Hotmix AC-WC &amp; Pemadatan Tandem Roller</text><rect x="40" y="330" width="520" height="45" rx="6" fill="%230f172ae6"/><text x="55" y="358" fill="%2310b981" font-size="13" font-family="monospace">WATERMARK: RUAS A | STA 0+100 - 0+150 | SELESAI &amp; RATA</text></svg>'
};

export const INITIAL_PATCHING_REPORTS: PatchingReport[] = [
  {
    id: 'rep-001',
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    side: 'Kiri',
    staStart: '0+100',
    staEnd: '0+150',
    lengthM: 50,
    widthM: 2.2,
    thicknessCm: 5,
    volumeM3: 5.5,
    tonnageTon: 12.65,
    damageType: 'Lubang & Amblas Berat',
    notes: 'Kondisi drainase samping telah dinormalisasi. Penghamparan aspal AC-WC suhu 145°C.',
    weather: 'Cerah',
    date: '2026-09-25',
    progressPercent: 100,
    photos: [
      {
        id: 'p-001-1',
        condition: '0%',
        url: SAMPLE_PHOTOS.zeroPercent,
        filename: 'RuasSarolangunPauh_STA0+100-0+150_0%_20260925_1.jpg',
        uploadedAt: '2026-09-25T08:10:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Kondisi awal sebelum galian/cutting'
      },
      {
        id: 'p-001-2',
        condition: '50%',
        url: SAMPLE_PHOTOS.fiftyPercent,
        filename: 'RuasSarolangunPauh_STA0+100-0+150_50%_20260925_1.jpg',
        uploadedAt: '2026-09-25T11:30:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Penyemprotan lapis resap pengikat (Tack Coat)'
      },
      {
        id: 'p-001-3',
        condition: '100%',
        url: SAMPLE_PHOTOS.hundredPercent,
        filename: 'RuasSarolangunPauh_STA0+100-0+150_100%_20260925_1.jpg',
        uploadedAt: '2026-09-25T14:45:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Hasil pemadatan akhir dengan Tandem Roller 8 Ton'
      }
    ],
    status: 'Disetujui PPK',
    pengawasReview: {
      byUserId: 'usr-pengawas-1',
      byUserName: 'Dian Prasetyo, S.T.',
      role: 'pengawas',
      timestamp: '2026-09-25T15:20:00Z',
      status: 'approved',
      notes: 'Suhu pemadatan sesuai spesifikasi Bina Marga 2020 Rev 2. Kerataan permukaan baik.'
    },
    ppkApproval: {
      byUserId: 'usr-ppk-1',
      byUserName: 'Ir. Bambang Hermanto, M.T.',
      role: 'ppk',
      timestamp: '2026-09-25T16:00:00Z',
      status: 'approved',
      notes: 'Disetujui untuk masuk dalam opname volume pembayaran termin 3.'
    },
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.',
      role: 'pelaksana',
      agency: 'PT Sarolangun Jaya Konstruksi'
    },
    createdAt: '2026-09-25T08:15:00Z',
    updatedAt: '2026-09-25T16:00:00Z',
    history: [
      {
        timestamp: '2026-09-25T08:15:00Z',
        userId: 'usr-pelaksana-1',
        userName: 'Hendra Wijaya, S.T.',
        action: 'INPUT',
        details: 'Membuat draf laporan pekerjaan STA 0+100 - 0+150'
      },
      {
        timestamp: '2026-09-25T14:50:00Z',
        userId: 'usr-pelaksana-1',
        userName: 'Hendra Wijaya, S.T.',
        action: 'UPDATE',
        details: 'Mengunggah foto kondisi 50% dan 100%, mengajukan verifikasi pengawas'
      },
      {
        timestamp: '2026-09-25T15:20:00Z',
        userId: 'usr-pengawas-1',
        userName: 'Dian Prasetyo, S.T.',
        action: 'VERIFIKASI',
        details: 'Pengawas menyetujui mutu dan volume lapangan'
      },
      {
        timestamp: '2026-09-25T16:00:00Z',
        userId: 'usr-ppk-1',
        userName: 'Ir. Bambang Hermanto, M.T.',
        action: 'APPROVAL',
        details: 'PPK mengesahkan laporan'
      }
    ]
  },
  {
    id: 'rep-002',
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    side: 'Kanan',
    staStart: '0+150',
    staEnd: '0+210',
    lengthM: 60,
    widthM: 3.0,
    thicknessCm: 4,
    volumeM3: 7.2,
    tonnageTon: 16.56,
    damageType: 'Retak Buaya & Lubang Tersebar',
    notes: 'Pekerjaan tack coat telah selesai, menunggu antrean truk aspal AC-WC dari AMP.',
    weather: 'Berawan',
    date: '2026-09-25',
    progressPercent: 50,
    photos: [
      {
        id: 'p-002-1',
        condition: '0%',
        url: SAMPLE_PHOTOS.zeroPercent,
        filename: 'RuasSarolangunPauh_STA0+150-0+210_0%_20260925_1.jpg',
        uploadedAt: '2026-09-25T09:00:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Kondisi sebelum kupas aspal'
      },
      {
        id: 'p-002-2',
        condition: '50%',
        url: SAMPLE_PHOTOS.fiftyPercent,
        filename: 'RuasSarolangunPauh_STA0+150-0+210_50%_20260925_1.jpg',
        uploadedAt: '2026-09-25T13:10:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Sedang proses perapihan tebing galian dan tack coat'
      }
    ],
    status: 'Menunggu Verifikasi Pengawas',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.',
      role: 'pelaksana',
      agency: 'PT Sarolangun Jaya Konstruksi'
    },
    createdAt: '2026-09-25T09:10:00Z',
    updatedAt: '2026-09-25T13:15:00Z',
    history: [
      {
        timestamp: '2026-09-25T09:10:00Z',
        userId: 'usr-pelaksana-1',
        userName: 'Hendra Wijaya, S.T.',
        action: 'INPUT',
        details: 'Membuat laporan pekerjaan STA 0+150 - 0+210 progres 50%'
      }
    ]
  },
  {
    id: 'rep-003',
    roadName: 'Ruas Pauh - Mandiangin KM 24+000 - 28+000',
    side: 'Kiri',
    staStart: '14+200',
    staEnd: '14+280',
    lengthM: 80,
    widthM: 2.5,
    thicknessCm: 5,
    volumeM3: 10.0,
    tonnageTon: 23.0,
    damageType: 'Amblas Jalur Roda & Lubang Tepi',
    notes: 'Telah dilakukan penandaan cat pilox putih, galian dan pembersihan dijadwalkan besok pagi.',
    weather: 'Cerah',
    date: '2026-09-25',
    progressPercent: 0,
    photos: [
      {
        id: 'p-003-1',
        condition: '0%',
        url: SAMPLE_PHOTOS.zeroPercent,
        filename: 'JlLingkarKM14_STA14+200-14+280_0%_20260925_1.jpg',
        uploadedAt: '2026-09-25T10:00:00Z',
        uploadedBy: 'Hendra Wijaya, S.T.',
        caption: 'Dokumentasi 0% inventarisasi lubang'
      }
    ],
    status: 'Draft',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.',
      role: 'pelaksana',
      agency: 'PT Sarolangun Jaya Konstruksi'
    },
    createdAt: '2026-09-25T10:15:00Z',
    updatedAt: '2026-09-25T10:15:00Z',
    history: [
      {
        timestamp: '2026-09-25T10:15:00Z',
        userId: 'usr-pelaksana-1',
        userName: 'Hendra Wijaya, S.T.',
        action: 'INPUT',
        details: 'Input data identifikasi titik lubang STA 14+200 - 14+280'
      }
    ]
  }
];

export const INITIAL_LETTERS: LetterItem[] = [
  {
    id: 'let-001',
    letterNumber: '028/SPK/BBM-WIL2/IX/2026',
    letterDate: '2026-09-10',
    receivedOrSentDate: '2026-09-12',
    type: 'masuk',
    subject: 'Instruksi Percepatan Penutupan Lubang Jalur Utama Pantura',
    originOrDestination: 'PPK Preservasi Jalan Wilayah II Jawa Tengah',
    attachmentName: 'Instruksi_Percepatan_Patching_028.pdf',
    attachmentData: '',
    attachmentType: 'application/pdf',
    status: 'selesai',
    dispositionNotes: 'Sudah ditindaklanjuti dengan pengerahan 2 grup kerja pelaksana dan tambahan alat tandem.',
    createdBy: {
      id: 'usr-admin-1',
      name: 'Budi Santoso, S.T., M.Eng.'
    },
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-15T11:00:00Z'
  },
  {
    id: 'let-002',
    letterNumber: '115/KT-BMN/OPS/IX/2026',
    letterDate: '2026-09-20',
    receivedOrSentDate: '2026-09-21',
    type: 'keluar',
    subject: 'Permohonan Pengujian Uji Petik Mutu Aspal AC-WC (Core Drill)',
    originOrDestination: 'Konsultan Supervisi PT Rekayasa Konsultan Sarolangun',
    attachmentName: 'Permohonan_CoreDrill_115.pdf',
    attachmentData: '',
    attachmentType: 'application/pdf',
    status: 'proses',
    dispositionNotes: 'Jadwal pelaksanaan uji core drill disepakati hari Senin jam 09.00 WIB.',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-22T08:30:00Z'
  },
  {
    id: 'let-003',
    letterNumber: '089/REKA-SUP/EVAL/IX/2026',
    letterDate: '2026-09-23',
    receivedOrSentDate: '2026-09-24',
    type: 'masuk',
    subject: 'Catatan Evaluasi Mingguan K3 dan Rambu Pengatur Lalu Lintas Lapangan',
    originOrDestination: 'PT Rekayasa Konsultan Sarolangun',
    attachmentName: 'Evaluasi_K3_Rambu_PUPR.pdf',
    attachmentData: '',
    attachmentType: 'application/pdf',
    status: 'proses',
    dispositionNotes: 'Flagman wajib menggunakan rompi scotlight baru dan safety cone ditambah 20 unit.',
    createdBy: {
      id: 'usr-pengawas-1',
      name: 'Dian Prasetyo, S.T.'
    },
    createdAt: '2026-09-24T14:00:00Z',
    updatedAt: '2026-09-24T14:00:00Z'
  }
];

export const INITIAL_MATERIALS: MaterialTransaction[] = [
  {
    id: 'mat-001',
    materialName: 'Aspal AC-WC Hotmix',
    date: '2026-09-24',
    type: 'masuk',
    amount: 50.0,
    unit: 'Ton',
    sourceOrDestination: 'AMP PT Adhi Mitra Persada (Batch 412)',
    notes: 'Suhu tiba di lokasi 155°C, sertifikat uji gradasi terlampir',
    waybillNumber: 'SJ-AMP-8821',
    proofPhotoName: 'Tiket_Timbang_AMP_8821.jpg',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-24T07:30:00Z'
  },
  {
    id: 'mat-002',
    materialName: 'Aspal AC-WC Hotmix',
    date: '2026-09-25',
    type: 'pakai',
    amount: 12.65,
    unit: 'Ton',
    sourceOrDestination: 'Titik Gelar STA 0+100 - 0+150 Kiri',
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    staLocation: 'STA 0+100 - 0+150',
    notes: 'Dipakai pada pekerjaan patching tebal 5 cm padat',
    waybillNumber: 'LHP-20260925-01',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T14:00:00Z'
  },
  {
    id: 'mat-003',
    materialName: 'Tack Coat (Aspal Emulsi)',
    date: '2026-09-23',
    type: 'masuk',
    amount: 10,
    unit: 'Drum',
    sourceOrDestination: 'PT Pertamina Petrochemical Balongan',
    notes: 'Kondisi drum utuh dan tersegel resmi',
    waybillNumber: 'SJ-PERTAMINA-901',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-23T11:00:00Z'
  },
  {
    id: 'mat-004',
    materialName: 'Tack Coat (Aspal Emulsi)',
    date: '2026-09-25',
    type: 'pakai',
    amount: 1.5,
    unit: 'Drum',
    sourceOrDestination: 'Asphalt Sprayer Ruas Pantura',
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    staLocation: 'STA 0+100 - 0+210',
    notes: 'Tack coat disemprot merata 0.35 L/m2',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T11:00:00Z'
  },
  {
    id: 'mat-005',
    materialName: 'Agregat Kelas A',
    date: '2026-09-22',
    type: 'masuk',
    amount: 45,
    unit: 'm³',
    sourceOrDestination: 'Quarry Gunung Kuda Cirebon',
    notes: 'Uji CBR lab > 90%',
    waybillNumber: 'SJ-QUARRY-449',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-22T13:00:00Z'
  }
];

export const INITIAL_EQUIPMENT_LOGS: EquipmentLog[] = [
  {
    id: 'eq-001',
    equipmentName: 'Tandem Roller 8-10 Ton',
    equipmentType: 'Compactor',
    equipmentCode: 'TR-01 (Dynapac CC2200)',
    date: '2026-09-25',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 60,
    totalHours: 7,
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    locationSta: 'STA 0+100 - 0+210',
    operatorName: 'Suryanto',
    status: 'Beroperasi Normal',
    fuelAddedLiters: 40,
    notes: 'Pemadatan break-down dan finishing berjalan lancar tanpa kendala.',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T16:15:00Z'
  },
  {
    id: 'eq-002',
    equipmentName: 'Asphalt Cutter & Jack Hammer',
    equipmentType: 'Cutting Machine',
    equipmentCode: 'AC-03 (Husqvarna)',
    date: '2026-09-25',
    startTime: '08:30',
    endTime: '12:00',
    breakMinutes: 0,
    totalHours: 3.5,
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    locationSta: 'STA 0+150 - 0+210',
    operatorName: 'Agus Salim',
    status: 'Beroperasi Normal',
    fuelAddedLiters: 15,
    notes: 'Pisau potong diamond blade baru diganti, potongan rapi vertikal.',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T12:30:00Z'
  },
  {
    id: 'eq-003',
    equipmentName: 'Asphalt Sprayer Emulsi 1000L',
    equipmentType: 'Sprayer',
    equipmentCode: 'AS-02 (Multitech)',
    date: '2026-09-25',
    startTime: '10:30',
    endTime: '13:30',
    breakMinutes: 30,
    totalHours: 2.5,
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    locationSta: 'STA 0+100 - 0+210',
    operatorName: 'Wahyu Hidayat',
    status: 'Beroperasi Normal',
    fuelAddedLiters: 10,
    notes: 'Nozzle bersih, semprotan merata ke seluruh bidang lubang jalan.',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T13:45:00Z'
  },
  {
    id: 'eq-004',
    equipmentName: 'Dump Truck Isuzu Giga 12 Ton',
    equipmentType: 'Transport Truck',
    equipmentCode: 'DT-05 (B 9823 KDA)',
    date: '2026-09-25',
    startTime: '07:00',
    endTime: '15:00',
    breakMinutes: 60,
    totalHours: 7,
    roadName: 'Ruas Sarolangun - Pauh KM 10+000 - 15+000',
    locationSta: 'Lintas AMP ke Lapangan',
    operatorName: 'Pak Dedi M.',
    status: 'Beroperasi Normal',
    fuelAddedLiters: 60,
    notes: 'Mengangkut hotmix dari AMP, terpal penutup rapat suhu aspal terjaga.',
    createdBy: {
      id: 'usr-pelaksana-1',
      name: 'Hendra Wijaya, S.T.'
    },
    createdAt: '2026-09-25T15:10:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-09-25T08:15:00Z',
    userId: 'usr-pelaksana-1',
    userName: 'Hendra Wijaya, S.T.',
    userRole: 'pelaksana',
    module: 'Laporan Patching',
    action: 'TAMBAH',
    description: 'Menambahkan laporan patching baru: Ruas Pantura STA 0+100 - 0+150 (Volume: 5.50 m³)',
    targetId: 'rep-001'
  },
  {
    id: 'log-002',
    timestamp: '2026-09-25T15:20:00Z',
    userId: 'usr-pengawas-1',
    userName: 'Dian Prasetyo, S.T.',
    userRole: 'pengawas',
    module: 'Laporan Patching',
    action: 'VERIFIKASI_PENGAWAS',
    description: 'Memberikan verifikasi lapangan dan catatan mutu pada STA 0+100 - 0+150',
    targetId: 'rep-001'
  },
  {
    id: 'log-003',
    timestamp: '2026-09-25T16:00:00Z',
    userId: 'usr-ppk-1',
    userName: 'Ir. Bambang Hermanto, M.T.',
    userRole: 'ppk',
    module: 'Laporan Patching',
    action: 'APPROVAL_PPK',
    description: 'Mengesahkan laporan pekerjaan jalan STA 0+100 - 0+150',
    targetId: 'rep-001'
  },
  {
    id: 'log-004',
    timestamp: '2026-09-25T07:30:00Z',
    userId: 'usr-pelaksana-1',
    userName: 'Hendra Wijaya, S.T.',
    userRole: 'pelaksana',
    module: 'Material Jalan',
    action: 'TAMBAH',
    description: 'Mencatat transaksi material MASUK: Aspal AC-WC 50.00 Ton dari AMP PT Adhi Mitra',
    targetId: 'mat-001'
  },
  {
    id: 'log-005',
    timestamp: '2026-09-25T08:30:00Z',
    userId: 'usr-admin-1',
    userName: 'Budi Santoso, S.T., M.Eng.',
    userRole: 'admin',
    module: 'Autentikasi',
    action: 'LOGIN',
    description: 'Pengguna berhasil masuk ke sistem melalui portal web',
    ipAddress: '192.168.1.105'
  }
];
